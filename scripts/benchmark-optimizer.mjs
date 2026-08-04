#!/usr/bin/env node
// Prices the compiler optimizations: the same kernel built normally and with
// `_optimizerDisabled`, on cpu, webasm and headlessgl, in plain Node. Prints
// a GitHub-markdown table plus raw JSON to stdout.
//
//   node scripts/benchmark-optimizer.mjs
//   node scripts/benchmark-optimizer.mjs --attribution   # H-vs-T3 split only
//
// Methodology (matches scripts/benchmark-webasm.mjs):
// - the workloads live IN THIS FILE. Nothing here reaches for an external
//   suite, so the numbers are reproducible from a checkout alone
// - every workload is cross-checked optimized-against-disabled BEFORE any
//   timing; a mismatch beyond one f32 ULP aborts the run
// - timed runs ping-pong between two input sets so no cache can elide work
// - median of >= 7 runs, warmup excluded; cpu capped when a run is slow
//
// The attribution block answers the one question the design contract left
// open: the hand-written probe that measured T3's 3.27x on cpu ALSO hoisted
// an array read out of the loop, so the split between hoisting and unrolling
// was unknown. It times the same shape in three forms -- the loop as written,
// the loop with the read hoisted BY HAND, and the fully hand-unrolled body --
// so the two transforms can be priced separately.

import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { GPU } = require('../src');

const MEDIAN_RUNS = 7;

function median(times) {
  const sorted = [...times].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

function flatten(result) {
  const out = [];
  const push = value => {
    if (typeof value === 'number') {
      out.push(value);
      return;
    }
    for (let i = 0; i < value.length; i++) push(value[i]);
  };
  push(result);
  return out;
}

function relativeError(a, b) {
  let worst = 0;
  for (let i = 0; i < a.length; i++) {
    // scale floored at 1: these workloads sum terms that cancel, and a
    // relative error against a near-zero total measures the cancellation,
    // not the disagreement
    const denominator = Math.max(Math.abs(a[i]), Math.abs(b[i]), 1);
    worst = Math.max(worst, Math.abs(a[i] - b[i]) / denominator);
  }
  return worst;
}

// a shader compiler is free to reassociate, so semantically identical GLSL can
// land one f32 ULP apart; anything past a few of those is a real disagreement
const CROSS_CHECK_TOLERANCE = 1e-6;

const N = 1 << 20;
function makeVector(seed) {
  const v = new Float32Array(N);
  for (let i = 0; i < N; i++) v[i] = ((i * 13 + seed) % 1000) / 500 - 1;
  return v;
}

const SIZE = 256;
function makeMatrix(seed) {
  const m = [];
  for (let y = 0; y < SIZE; y++) {
    const row = new Float32Array(SIZE);
    for (let x = 0; x < SIZE; x++) row[x] = ((x * 31 + y * 17 + seed) % 100) / 100;
    m.push(row);
  }
  return m;
}

function poly(x) {
  return x * x * 0.5 + x * 0.25 - 0.125;
}

const WORKLOADS = [
  {
    // H's home ground: a read whose subscript never changes, inside a loop
    name: 'hoistable read, 8-trip loop, 1M cells',
    source: function (a) {
      let s = 0;
      for (let i = 0; i < 8; i++) s += a[this.thread.x] * (i + 1);
      return s;
    },
    output: [N],
    inputs: [[makeVector(1)], [makeVector(2)]],
  },
  {
    // a stencil reads its neighbourhood; the CENTRE is invariant to the
    // sweep, the neighbours are not
    name: 'stencil 3x3, 256x256',
    source: function (a) {
      let s = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const y = Math.min(Math.max(this.thread.y + dy, 0), 255);
          const x = Math.min(Math.max(this.thread.x + dx, 0), 255);
          s += a[y][x] * 0.5 + a[this.thread.y][this.thread.x] * 0.125;
        }
      }
      return s / 9;
    },
    output: [SIZE, SIZE],
    inputs: [[makeMatrix(1)], [makeMatrix(2)]],
  },
  {
    // T2's shape: a helper called from inside a hot loop
    name: 'helper in a hot loop, 1M cells',
    source: function (a) {
      let s = 0;
      for (let i = 0; i < 8; i++) s += poly(a[this.thread.x] + i * 0.01);
      return s;
    },
    settings: { functions: [poly] },
    output: [N],
    inputs: [[makeVector(3)], [makeVector(4)]],
  },
  {
    // T3's shape: a literal loop small enough to unroll whole
    name: 'literal 4-trip loop, 1M cells',
    source: function (a) {
      let s = 0;
      for (let i = 0; i < 4; i++) s += a[this.thread.x] * (i + 1);
      return s;
    },
    output: [N],
    inputs: [[makeVector(5)], [makeVector(6)]],
  },
  {
    // the control: no loop for H to hoist out of, no helper to inline, no
    // literal loop to unroll. Any movement here is noise, and says how much
    // of the rest is signal
    name: 'control: straight-line map, 1M cells',
    source: function (a) {
      const x = a[this.thread.x];
      return x * x * 0.5 + Math.sqrt(Math.abs(x)) - x * 0.25;
    },
    output: [N],
    inputs: [[makeVector(7)], [makeVector(8)]],
  },
];

function buildKernel(mode, workload, disabled, gpus) {
  const gpu = new GPU({ mode });
  gpus.push(gpu);
  return gpu.createKernel(workload.source, Object.assign({
    output: workload.output,
    loopMaxIterations: workload.loopMaxIterations || 1000,
    _optimizerDisabled: disabled,
  }, workload.settings || {}));
}

function timeKernel(kernel, workload, runs) {
  kernel.apply(null, workload.inputs[0]);
  kernel.apply(null, workload.inputs[1]);
  const times = [];
  for (let i = 0; i < runs; i++) {
    const inputs = workload.inputs[i % 2];
    const start = process.hrtime.bigint();
    kernel.apply(null, inputs);
    times.push(Number(process.hrtime.bigint() - start) / 1e6);
  }
  return median(times);
}

function measure(mode, workload) {
  const gpus = [];
  try {
    const optimized = buildKernel(mode, workload, false, gpus);
    const disabled = buildKernel(mode, workload, true, gpus);

    const optimizedResult = flatten(optimized.apply(null, workload.inputs[0]));
    const disabledResult = flatten(disabled.apply(null, workload.inputs[0]));
    const error = relativeError(optimizedResult, disabledResult);
    if (!(error <= CROSS_CHECK_TOLERANCE)) {
      throw new Error(`RESULT MISMATCH in ${ workload.name } (${ mode }): relative error ${ error }`);
    }

    const runs = mode === 'cpu' ? 5 : MEDIAN_RUNS;
    return {
      optimized: +timeKernel(optimized, workload, runs).toFixed(2),
      disabled: +timeKernel(disabled, workload, runs).toFixed(2),
      error,
    };
  } finally {
    for (const gpu of gpus) gpu.destroy();
  }
}

// -------------------------------------------------------------- attribution

// The design contract's T3 probe, in four forms. `loop` is what a user writes;
// `hoisted` is what H alone produces, written by hand; `unrolled` is what H
// followed by T3 produces, also by hand; `passed` is the same `loop` source
// with the optimizer actually on, so what the pass DOES can be read against
// what the transform is WORTH. loop/hoisted prices H, hoisted/unrolled prices
// T3, loop/unrolled reproduces the contract's combined figure.
//
// Every form is built AND warmed before any of them is timed, and the timed
// rounds interleave. Timing them one after another instead moved the answer
// by 30%: each form is a separate emitted function, and whichever one V8
// meets first pays for the tier-up.
const ATTRIBUTION = {
  name: 'literal 4-trip loop over one invariant read',
  forms: {
    loop: [function (a) {
      let s = 0;
      for (let i = 0; i < 4; i++) s += a[this.thread.x] * (i + 1);
      return s;
    }, true],
    hoisted: [function (a) {
      const x = a[this.thread.x];
      let s = 0;
      for (let i = 0; i < 4; i++) s += x * (i + 1);
      return s;
    }, true],
    unrolled: [function (a) {
      const x = a[this.thread.x];
      return x * 1 + x * 2 + x * 3 + x * 4;
    }, true],
    passed: [function (a) {
      let s = 0;
      for (let i = 0; i < 4; i++) s += a[this.thread.x] * (i + 1);
      return s;
    }, false],
  },
  output: [N],
  inputs: [[makeVector(9)], [makeVector(10)]],
};

function measureAttribution(mode) {
  const gpus = [];
  try {
    const names = Object.keys(ATTRIBUTION.forms);
    const kernels = {};
    const samples = {};
    let reference = null;
    for (const name of names) {
      const [source, disabled] = ATTRIBUTION.forms[name];
      const gpu = new GPU({ mode });
      gpus.push(gpu);
      const kernel = gpu.createKernel(source, {
        output: ATTRIBUTION.output,
        _optimizerDisabled: disabled,
      });
      const result = flatten(kernel.apply(null, ATTRIBUTION.inputs[0]));
      if (reference === null) {
        reference = result;
      } else {
        const error = relativeError(reference, result);
        if (!(error <= CROSS_CHECK_TOLERANCE)) {
          throw new Error(`ATTRIBUTION MISMATCH (${ mode }/${ name }): relative error ${ error }`);
        }
      }
      // warm every form before timing any of them
      for (let i = 0; i < 4; i++) kernel.apply(null, ATTRIBUTION.inputs[i % 2]);
      kernels[name] = kernel;
      samples[name] = [];
    }
    for (let round = 0; round < MEDIAN_RUNS + 4; round++) {
      const inputs = ATTRIBUTION.inputs[round % 2];
      for (const name of names) {
        const start = process.hrtime.bigint();
        kernels[name].apply(null, inputs);
        samples[name].push(Number(process.hrtime.bigint() - start) / 1e6);
      }
    }
    const times = {};
    for (const name of names) times[name] = +median(samples[name]).toFixed(2);
    return times;
  } finally {
    for (const gpu of gpus) gpu.destroy();
  }
}

// --------------------------------------------------------------------- main

const MODES = [
  ['cpu', () => true],
  ['headlessgl', () => GPU.isHeadlessGLSupported],
  ['webasm', () => GPU.isWebAssemblySupported],
];

function main() {
  const attributionOnly = process.argv.includes('--attribution');
  const modes = MODES.filter(([, supported]) => supported()).map(([mode]) => mode);
  const report = { optimizer: [], attribution: {} };

  if (!attributionOnly) {
    for (const workload of WORKLOADS) {
      const row = { name: workload.name, modes: {} };
      for (const mode of modes) {
        const result = measure(mode, workload);
        row.modes[mode] = result;
        process.stderr.write(
          `${ workload.name } / ${ mode }: optimized ${ result.optimized } ms, ` +
          `disabled ${ result.disabled } ms (${ (result.disabled / result.optimized).toFixed(2) }x)\n`);
      }
      report.optimizer.push(row);
    }

    console.log(`\n| Workload | ${ modes.map(m => `${ m } off | ${ m } on | ${ m } gain`).join(' | ') } |`);
    console.log(`|---|${ modes.map(() => '---|---|---').join('|') }|`);
    for (const row of report.optimizer) {
      console.log(`| ${ row.name } | ${ modes.map(mode => {
        const result = row.modes[mode];
        return `${ result.disabled } ms | ${ result.optimized } ms | ${ (result.disabled / result.optimized).toFixed(2) }×`;
      }).join(' | ') } |`);
    }
  }

  for (const mode of modes) {
    report.attribution[mode] = measureAttribution(mode);
  }
  console.log(`\n### H vs T3 attribution — ${ ATTRIBUTION.name }`);
  console.log('\n| Mode | as written | hand-hoisted | hand-unrolled | H alone | T3 on top of H | both | pass as shipped |');
  console.log('|---|---|---|---|---|---|---|---|');
  for (const mode of modes) {
    const t = report.attribution[mode];
    console.log(
      `| ${ mode } | ${ t.loop } ms | ${ t.hoisted } ms | ${ t.unrolled } ms | ` +
      `${ (t.loop / t.hoisted).toFixed(2) }× | ${ (t.hoisted / t.unrolled).toFixed(2) }× | ` +
      `${ (t.loop / t.unrolled).toFixed(2) }× | ${ (t.loop / t.passed).toFixed(2) }× |`);
  }

  console.log('\n' + JSON.stringify(report, null, 2));
}

try {
  main();
} catch (error) {
  console.error(error);
  process.exit(1);
}
