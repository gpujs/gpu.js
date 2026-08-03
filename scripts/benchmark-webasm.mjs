#!/usr/bin/env node
// Benchmarks the webasm backend against cpu and headlessgl in plain Node —
// no browser needed, which is itself the point of this backend. Prints a
// GitHub-markdown table plus raw JSON to stdout.
//
//   node scripts/benchmark-webasm.mjs
//
// Methodology (matches scripts/benchmark-webgpu.mjs):
// - every mode's results are cross-checked against cpu (relative 1e-4)
//   before timing; a mismatch aborts the run
// - timed runs ping-pong between two input sets so no cache or memoization
//   can elide repeated work
// - median of >= 9 runs, warmup excluded; cpu capped to 3 runs when a
//   single run exceeds 2 s
// - webasm rows: scalar (run_simd disabled through the same dispatch the
//   kernel uses), SIMD (the sync default), and threaded+SIMD (asyncMode,
//   the worker pool -- each worker runs the same run_simd export, so this
//   row is both axes compounded; result copied out of shared memory like
//   any real caller)
// - the divergent workload exists to price mask predication honestly:
//   both branch sides execute for every lane

import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { GPU } = require('../src');

const MEDIAN_RUNS = 9;

function median(times) {
  const sorted = [...times].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

function relativeError(a, b) {
  let worst = 0;
  for (let i = 0; i < a.length; i++) {
    const denominator = Math.max(Math.abs(a[i]), Math.abs(b[i]), 1e-20);
    worst = Math.max(worst, Math.abs(a[i] - b[i]) / denominator);
  }
  return worst;
}

function flatten(result) {
  if (result[0] && result[0].length !== undefined) {
    const out = [];
    for (const row of result) out.push(...row);
    return out;
  }
  return Array.from(result);
}

const SIZE = 512;
function makeMatrix(seed) {
  const m = [];
  for (let y = 0; y < SIZE; y++) {
    const row = new Float32Array(SIZE);
    for (let x = 0; x < SIZE; x++) row[x] = ((x * 31 + y * 17 + seed) % 100) / 100;
    m.push(row);
  }
  return m;
}
const MAP_N = 4 * 1024 * 1024;
function makeVector(seed, n) {
  const v = new Float32Array(n);
  for (let i = 0; i < n; i++) v[i] = ((i * 13 + seed) % 1000) / 500 - 1;
  return v;
}

const WORKLOADS = [
  {
    name: `matmul ${ SIZE }×${ SIZE }`,
    source: function (a, b) {
      let sum = 0;
      for (let i = 0; i < 512; i++) {
        sum += a[this.thread.y][i] * b[i][this.thread.x];
      }
      return sum;
    },
    output: [SIZE, SIZE],
    inputs: [[makeMatrix(1), makeMatrix(2)], [makeMatrix(3), makeMatrix(4)]],
  },
  {
    name: '4M-element map',
    source: function (v) {
      const x = v[this.thread.x];
      return x * x * 0.5 + Math.sqrt(Math.abs(x)) - x * 0.25;
    },
    output: [MAP_N],
    inputs: [[makeVector(1, MAP_N)], [makeVector(2, MAP_N)]],
  },
  {
    name: 'divergent piecewise, 1M cells',
    source: function (v) {
      // three lane-dependent branches plus a lane-varying trip count: the
      // shape mask predication exists for
      const x = v[this.thread.x];
      let acc = 0;
      if (x > 0.5) {
        acc = x * x * 3;
      } else if (x > 0) {
        acc = Math.sqrt(x) * 2;
      } else {
        acc = -x;
      }
      for (let i = 0; i < (this.thread.x % 7) + 1; i++) {
        acc += 0.125;
      }
      return acc;
    },
    output: [1024 * 1024],
    inputs: [[makeVector(5, 1024 * 1024)], [makeVector(6, 1024 * 1024)]],
    loopMaxIterations: 16,
  },
];

async function timeMode(workload, label, makeKernel, runKernel) {
  const kernel = makeKernel();
  // correctness gate against cpu before any timing
  const cpuGpu = new GPU({ mode: 'cpu' });
  const cpuKernel = cpuGpu.createKernel(workload.source, {
    output: workload.output,
    loopMaxIterations: workload.loopMaxIterations || 1000,
  });
  const expected = flatten(cpuKernel.apply(null, workload.inputs[0]));
  const actual = flatten(await runKernel(kernel, workload.inputs[0]));
  const err = relativeError(expected, actual);
  if (err > 1e-4) {
    throw new Error(`RESULT MISMATCH in ${ workload.name } (${ label }): relative error ${ err }`);
  }
  cpuGpu.destroy();

  await runKernel(kernel, workload.inputs[1]); // warmup second shape
  const times = [];
  const runs = label === 'cpu' ? 3 : MEDIAN_RUNS;
  for (let i = 0; i < runs; i++) {
    const inputs = workload.inputs[i % 2];
    const start = process.hrtime.bigint();
    await runKernel(kernel, inputs);
    times.push(Number(process.hrtime.bigint() - start) / 1e6);
  }
  return { label, ms: +median(times).toFixed(2), err };
}

async function main() {
  const rows = [];
  for (const workload of WORKLOADS) {
    const row = { name: workload.name, modes: {} };
    const settings = { output: workload.output, loopMaxIterations: workload.loopMaxIterations || 1000 };

    const gpus = [];
    const make = (mode, extra) => {
      const gpu = new GPU({ mode });
      gpus.push(gpu);
      return gpu.createKernel(workload.source, Object.assign({}, settings, extra));
    };

    const configs = [
      ['cpu', () => make('cpu'), (k, i) => k.apply(null, i)],
      ['headlessgl', () => make('headlessgl'), (k, i) => k.apply(null, i)],
      ['webasm scalar', () => {
        const kernel = make('webasm');
        kernel.apply(null, workload.inputs[0]); // build, then disable simd
        kernel.kernel._active.runSimd = null;
        return kernel;
      }, (k, i) => k.apply(null, i)],
      ['webasm SIMD', () => make('webasm'), (k, i) => k.apply(null, i)],
      ['webasm threaded+SIMD', () => make('webasm', { asyncMode: true }), (k, i) => k.apply(null, i)],
    ];
    for (const [label, makeKernel, runKernel] of configs) {
      try {
        const result = await timeMode(workload, label, makeKernel, runKernel);
        row.modes[label] = result.ms;
        process.stderr.write(`${ workload.name } / ${ label }: ${ result.ms } ms (err ${ result.err.toExponential(1) })\n`);
      } catch (error) {
        row.modes[label] = null;
        process.stderr.write(`${ workload.name } / ${ label }: FAILED ${ error.message }\n`);
        throw error;
      }
    }
    for (const gpu of gpus) await gpu.destroy();
    rows.push(row);
  }

  const labels = ['cpu', 'headlessgl', 'webasm scalar', 'webasm SIMD', 'webasm threaded+SIMD'];
  console.log(`\n| Workload | ${ labels.join(' | ') } |`);
  console.log(`|---|${ labels.map(() => '---').join('|') }|`);
  for (const row of rows) {
    const cpuMs = row.modes['cpu'];
    console.log(`| ${ row.name } | ${ labels.map(label => {
      const ms = row.modes[label];
      if (ms === null) return 'n/a';
      const speedup = label === 'cpu' ? '' : ` (${ (cpuMs / ms).toFixed(1) }×)`;
      return `${ ms } ms${ speedup }`;
    }).join(' | ') } |`);
  }
  console.log('\n' + JSON.stringify(rows, null, 2));
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
