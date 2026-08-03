#!/usr/bin/env node
// Benchmarks createPipeline against today's per-pass kernel chaining on the
// gauntlet's two iterative-stencil workloads, in plain Node. Prints a
// GitHub-markdown table plus raw JSON to stdout.
//
//   node scripts/benchmark-pipeline.mjs
//
// The workloads are the gpu.rocks gauntlet's jacobi and heat rows — same
// make(), same fp32-exact constants, same index-weighted checksums, same
// hand-tuned flat-buffer plain-JS oracle — copied here rather than imported
// so the benchmark does not reach outside this repo. Methodology follows
// the gauntlet runner:
// - every mode's checksum is validated against the oracle (relative 1e-3)
//   before timing; a mismatch aborts the run
// - pipeline rows additionally assert executorKind after the validation
//   call, so a silent fallback can never be benchmarked under its label
// - median of up to 5 runs; once a single run exceeds 2 s the loop is
//   capped at the next run
// - every run starts from the pristine grid (the oracle re-copies u0, the
//   per-pass row re-reads its resident u0 texture, the pipeline re-samples
//   its arguments), so no run inherits a prior run's relaxation
//
// Cost accounting is deliberately tilted against the pipeline: the per-pass
// row uploads its inputs ONCE at build (the gauntlet's contract — a real
// solver uploads its problem once) while pipeline rows pay the argument
// snapshot + upload on EVERY call, because that is what a pipeline call
// costs. Speedups in the table are relative to the per-pass row, which is
// the number the design contract's acceptance bar is written against.

import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { GPU } = require('../src');

const N = 1024;

function lcg(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return (s >>> 8) / 0x1000000;
  };
}

// Rows of a flat grid as a 2-D array, which is what a gpu.js kernel indexes.
// subarray, not slice: these are views, so nothing is copied here — the
// pipeline's own call-time snapshot is the copy being priced.
function rows(flat, n) {
  const out = [];
  for (let y = 0; y < n; y++) out.push(flat.subarray(y * n, y * n + n));
  return out;
}

function relativeError(a, b) {
  const denominator = Math.max(Math.abs(a), Math.abs(b), 1e-20);
  return Math.abs(a - b) / denominator;
}

// gpu.js hands back rows, the oracle hands back one flat array; both shapes
// are walked rather than flattened. Index-weighted so a backend that swept
// only part of the grid cannot match by luck.
function weightedSum(out, squared) {
  let acc = 0;
  if (ArrayBuffer.isView(out)) {
    for (let i = 0; i < out.length; i++) {
      const v = squared ? out[i] * out[i] : out[i];
      acc += v * (1 + (i % 17));
    }
  } else {
    for (let y = 0; y < out.length; y++) {
      const row = out[y];
      for (let x = 0; x < row.length; x++) {
        const v = squared ? row[x] * row[x] : row[x];
        acc += v * (1 + ((y * N + x) % 17));
      }
    }
  }
  return acc / (N * N);
}

const identitySource = function (v) {
  return v[this.thread.y][this.thread.x];
};

function jacobi() {
  const SWEEPS = 512;
  const HI = N - 2;
  const C = (N - 1) / 2; // grid centre, exact in fp32
  const INV = Math.fround(2 / (N - 1));
  const QS = 1 / 1024; // power of two, exact everywhere

  const sweepSource = function (u, src) {
    const x = this.thread.x;
    const y = this.thread.y;
    // Dirichlet edge, copied through — keeps both ping-pong buffers holding
    // a correct edge without either being pre-filled
    if (x < 1 || y < 1 || x > this.constants.hi || y > this.constants.hi) {
      return u[y][x];
    }
    return 0.25 * (u[y - 1][x] + u[y + 1][x] + u[y][x - 1] + u[y][x + 1]) + src[y][x];
  };

  return {
    name: `jacobi ${ N }×${ N }, ${ SWEEPS } sweeps`,
    make() {
      const rnd = lcg(0x27d4eb2f);
      const u0 = new Float32Array(N * N);
      const q = new Float32Array(N * N);
      for (let y = 0; y < N; y++) {
        const sy = (y - C) * INV;
        for (let x = 0; x < N; x++) {
          const sx = (x - C) * INV;
          const i = y * N + x;
          u0[i] = 0.5 + 0.25 * Math.sin(3 * Math.PI * sx) * Math.sin(2 * Math.PI * sy) + 0.1 * (rnd() - 0.5);
          q[i] = QS * (2 - sx * sx - sy * sy);
        }
      }
      return { u0, q };
    },
    js({ u0, q }) {
      // copied, not aliased: both buffers get the boundary because both take
      // a turn as the source
      let src = new Float32Array(u0);
      let dst = new Float32Array(u0);
      for (let s = 0; s < SWEEPS; s++) {
        for (let y = 1; y <= HI; y++) {
          const row = y * N;
          for (let x = 1; x <= HI; x++) {
            const i = row + x;
            dst[i] = 0.25 * (src[i - N] + src[i + N] + src[i - 1] + src[i + 1]) + q[i];
          }
        }
        const t = src;
        src = dst;
        dst = t;
      }
      return src;
    },
    reduce(out) {
      return weightedSum(out, false);
    },
    async perPass(gpu, { u0, q }) {
      // two instances of one kernel body: with immutable:false a kernel
      // reuses its own output texture, so one instance cannot both read the
      // previous sweep and overwrite it
      const settings = { constants: { hi: HI }, output: [N, N], pipeline: true };
      const kA = gpu.createKernel(sweepSource, settings);
      const kB = gpu.createKernel(sweepSource, settings);
      // two identity uploads, not one called twice: the second call would
      // hand back the texture it filled the first time
      const upU = gpu.createKernel(identitySource, { output: [N, N], pipeline: true });
      const upQ = gpu.createKernel(identitySource, { output: [N, N], pipeline: true });
      const u0Tex = await upU(rows(u0, N));
      const qTex = await upQ(rows(q, N));
      return {
        async run() {
          // sweep 0 reads the pristine u0 texture and writes kA's own, so
          // every run starts from the same grid
          let t = u0Tex;
          for (let s = 0; s < SWEEPS; s++) t = await (s % 2 === 0 ? kA : kB)(t, qTex);
          return t.toArray ? await t.toArray() : t;
        },
      };
    },
    buildPipeline(gpu, { u0, q }) {
      // ONE kernel — double-buffering the ping-pong is the plan's business
      const sweep = gpu.createKernel(sweepSource, { constants: { hi: HI }, output: [N, N] });
      const solve = gpu.createPipeline(function (u, src) {
        for (let s = 0; s < this.constants.sweeps; s++) {
          u = sweep(u, src);
        }
        return u;
      }, { constants: { sweeps: SWEEPS } });
      const uRows = rows(u0, N);
      const qRows = rows(q, N);
      return { shortcut: solve, run: () => solve(uRows, qRows) };
    },
  };
}

function heat() {
  const STEPS = 1024;
  const HI = N - 2;
  const ALPHA = Math.fround(0.2); // rounded to fp32 once, shared by every column

  const stepSource = function (u) {
    const x = this.thread.x;
    const y = this.thread.y;
    if (x < 1 || y < 1 || x > this.constants.hi || y > this.constants.hi) {
      return u[y][x];
    }
    const c = u[y][x];
    return c + this.constants.alpha * (u[y - 1][x] + u[y + 1][x] + u[y][x - 1] + u[y][x + 1] - 4 * c);
  };

  return {
    name: `heat ${ N }×${ N }, ${ STEPS } steps`,
    make() {
      const rnd = lcg(0x1b873593);
      const u0 = new Float32Array(N * N);
      const k = (2 * Math.PI) / 32; // 32-cell wavelength the run annihilates
      for (let y = 0; y < N; y++) {
        const sy = Math.sin(k * y);
        for (let x = 0; x < N; x++) {
          u0[y * N + x] = 0.5 + 0.45 * Math.sin(k * x) * sy + 0.05 * (rnd() - 0.5);
        }
      }
      return { u0 };
    },
    js({ u0 }) {
      let src = new Float32Array(u0);
      let dst = new Float32Array(u0);
      for (let s = 0; s < STEPS; s++) {
        for (let y = 1; y <= HI; y++) {
          const row = y * N;
          for (let x = 1; x <= HI; x++) {
            const i = row + x;
            const c = src[i];
            dst[i] = c + ALPHA * (src[i - N] + src[i + N] + src[i - 1] + src[i + 1] - 4 * c);
          }
        }
        const t = src;
        src = dst;
        dst = t;
      }
      return src;
    },
    // field energy: diffusion conserves the mean, so a mean-based checksum
    // would pass a backend that did nothing; the sum of squares falls 17%
    reduce(out) {
      return weightedSum(out, true);
    },
    async perPass(gpu, { u0 }) {
      const settings = { constants: { hi: HI, alpha: ALPHA }, output: [N, N], pipeline: true };
      const kA = gpu.createKernel(stepSource, settings);
      const kB = gpu.createKernel(stepSource, settings);
      const upload = gpu.createKernel(identitySource, { output: [N, N], pipeline: true });
      const u0Tex = await upload(rows(u0, N));
      return {
        async run() {
          let t = u0Tex;
          for (let s = 0; s < STEPS; s++) t = await (s % 2 === 0 ? kA : kB)(t);
          return t.toArray ? await t.toArray() : t;
        },
      };
    },
    buildPipeline(gpu, { u0 }) {
      const step = gpu.createKernel(stepSource, { constants: { hi: HI, alpha: ALPHA }, output: [N, N] });
      const diffuse = gpu.createPipeline(function (u) {
        for (let s = 0; s < this.constants.steps; s++) {
          u = step(u);
        }
        return u;
      }, { constants: { steps: STEPS } });
      const uRows = rows(u0, N);
      return { shortcut: diffuse, run: () => diffuse(uRows) };
    },
  };
}

const MODES = [
  { label: 'plain JS', oracle: true },
  { label: 'webasm per-pass', perPass: true },
  { label: 'pipeline generic', kind: 'generic', hook: pipeline => (pipeline._fusionDisabled = true) },
  { label: 'pipeline fused-sync', kind: 'fused-sync', hook: pipeline => (pipeline._threadsDisabled = true) },
  { label: 'pipeline fused-threaded', kind: 'fused-threaded' },
];

async function timeRuns(run) {
  const times = [];
  let runs = 5;
  for (let i = 0; i < runs; i++) {
    const start = process.hrtime.bigint();
    await run();
    const ms = Number(process.hrtime.bigint() - start) / 1e6;
    times.push(ms);
    if (ms > 2000) runs = Math.min(runs, i + 2);
  }
  times.sort((a, b) => a - b);
  return +times[Math.floor(times.length / 2)].toFixed(2);
}

async function main() {
  const table = [];
  for (const workload of [jacobi(), heat()]) {
    const inputs = workload.make();
    const row = { name: workload.name, modes: {} };
    let expected = null;
    for (const mode of MODES) {
      let gpu = null;
      let built;
      if (mode.oracle) {
        built = { run: async () => workload.js(inputs) };
      } else {
        gpu = new GPU({ mode: 'webasm' });
        if (mode.perPass) {
          built = await workload.perPass(gpu, inputs);
        } else {
          built = workload.buildPipeline(gpu, inputs);
          if (mode.hook) mode.hook(built.shortcut.pipeline);
        }
      }
      // correctness gate before any timing; also the compile/pool warmup
      const checksum = workload.reduce(await built.run());
      if (mode.oracle) {
        expected = checksum;
      } else {
        const err = relativeError(expected, checksum);
        if (err > 1e-3) {
          throw new Error(`CHECKSUM MISMATCH in ${ workload.name } (${ mode.label }): ${ checksum } vs ${ expected } (relative ${ err })`);
        }
      }
      if (mode.kind && built.shortcut.executorKind !== mode.kind) {
        throw new Error(`EXECUTOR MISMATCH in ${ workload.name } (${ mode.label }): got '${ built.shortcut.executorKind }' (fallbackReason: ${ built.shortcut.fallbackReason })`);
      }
      const ms = await timeRuns(built.run);
      row.modes[mode.label] = { ms, checksum };
      process.stderr.write(`${ workload.name } / ${ mode.label }: ${ ms } ms (checksum ${ checksum.toFixed(6) })\n`);
      if (gpu) await gpu.destroy();
    }
    table.push(row);
  }

  const labels = MODES.map(mode => mode.label);
  console.log(`\n| Workload | ${ labels.join(' | ') } |`);
  console.log(`|---|${ labels.map(() => '---').join('|') }|`);
  for (const row of table) {
    const baseline = row.modes['webasm per-pass'].ms;
    console.log(`| ${ row.name } | ${ labels.map(label => {
      const ms = row.modes[label].ms;
      const speedup = label === 'webasm per-pass' ? ' (1×)' : ` (${ (baseline / ms).toFixed(2) }×)`;
      return `${ ms } ms${ speedup }`;
    }).join(' | ') } |`);
  }
  console.log('\n' + JSON.stringify(table, null, 2));
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
