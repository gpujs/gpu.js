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
// - median of >= 7 runs, warmup excluded
// - each workload is built three ways -- optimizer off, `loopUnrollLimit: 0`,
//   and everything on -- so the shipped total splits into what the unroller
//   contributes and what the rest do. All three are built and warmed before
//   any is timed, and the timed rounds interleave
// - each workload runs in a process of its own, so one workload's V8 state
//   cannot decide another's answer
//
// The attribution block answers the one question the design contract left
// open: the hand-written probe that measured T3's 3.27x on cpu ALSO hoisted
// an array read out of the loop, so the split between hoisting and unrolling
// was unknown. It times the same shape in three forms -- the loop as written,
// the loop with the read hoisted BY HAND, and the fully hand-unrolled body --
// so the two transforms can be priced separately.

import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const { GPU } = require('../src');

const scriptPath = fileURLToPath(import.meta.url);
const MEDIAN_RUNS = 7;

function median(times) {
  const sorted = [...times].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

/**
 * The worst relative disagreement between two results, walked in place.
 * Copying a million cells into a plain array first -- which is what the
 * obvious flatten-then-compare does -- allocates 8MB per build and moves the
 * numbers it is supposed to be checking: the coordinate-heavy workload read
 * 1.06x that way and 1.82x without, reproducibly. A cross-check has to be
 * free, so this one allocates nothing.
 */
function relativeError(a, b) {
  if (typeof a === 'number') {
    // scale floored at 1: these workloads sum terms that cancel, and a
    // relative error against a near-zero total measures the cancellation,
    // not the disagreement
    return Math.abs(a - b) / Math.max(Math.abs(a), Math.abs(b), 1);
  }
  let worst = 0;
  for (let i = 0; i < a.length; i++) {
    const error = relativeError(a[i], b[i]);
    if (error > worst) worst = error;
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
    // T3 at its best: literal bounds nested two deep, so the whole 3x3 sweep
    // becomes nine copies with no counters left
    name: 'nested literal 3x3 loop, 256x256',
    source: function (a) {
      let s = 0;
      for (let dy = 0; dy < 3; dy++) {
        for (let dx = 0; dx < 3; dx++) {
          s += a[this.thread.y][this.thread.x] * (dy * 3 + dx);
        }
      }
      return s;
    },
    output: [SIZE, SIZE],
    inputs: [[makeMatrix(9)], [makeMatrix(10)]],
  },
  {
    // T1's home ground: no loop to hoist out of or unroll, just coordinates
    // read over and over. On cpu each read is a property lookup on a shared
    // mutable object; every other backend already holds them in something
    // local, so this doubles as their control
    name: 'coordinate-heavy straight-line map, 1M cells',
    source: function (a) {
      const x = this.thread.x;
      const y = this.thread.y;
      const z = this.thread.z;
      return a[x] * 0.5 + x * 0.25 + y + z +
        (x + y) * (x - z) * 1e-9 + a[this.thread.x] * this.thread.x * 1e-9;
    },
    output: [N],
    inputs: [[makeVector(11)], [makeVector(12)]],
  },
  {
    // the control: no loop for H to hoist out of, no helper to inline, no
    // literal loop to unroll, one coordinate read. Any movement here is
    // noise, and says how much of the rest is signal
    name: 'control: straight-line map, 1M cells',
    source: function (a) {
      const x = a[this.thread.x];
      return x * x * 0.5 + Math.sqrt(Math.abs(x)) - x * 0.25;
    },
    output: [N],
    inputs: [[makeVector(7)], [makeVector(8)]],
  },
];

// The three builds each workload is priced at. `loopUnrollLimit: 0` is the
// only per-transform switch the pass exposes, and it is enough to split the
// shipped total: everything minus unrolling is the middle build, so
// disabled/partial prices H and T1 together and partial/optimized prices T3.
const BUILDS = {
  disabled: { _optimizerDisabled: true },
  partial: { loopUnrollLimit: 0 },
  optimized: {},
};

function buildKernel(mode, workload, build, gpus) {
  const gpu = new GPU({ mode });
  gpus.push(gpu);
  return gpu.createKernel(workload.source, Object.assign({
    output: workload.output,
    loopMaxIterations: workload.loopMaxIterations || 1000,
  }, workload.settings || {}, BUILDS[build]));
}

/**
 * Every build is constructed and warmed before any of them is timed, and the
 * timed rounds interleave. Timing them one after another instead moved the
 * answer by 30%: each is a separate emitted function, and whichever one V8
 * meets first pays for the tier-up.
 */
function measure(mode, workload) {
  const gpus = [];
  const names = Object.keys(BUILDS);
  try {
    const kernels = {};
    const samples = {};
    let reference = null;
    let error = 0;
    for (const name of names) {
      const kernel = buildKernel(mode, workload, name, gpus);
      const result = kernel.apply(null, workload.inputs[0]);
      if (reference === null) {
        reference = result;
      } else {
        error = Math.max(error, relativeError(reference, result));
        if (!(error <= CROSS_CHECK_TOLERANCE)) {
          throw new Error(`RESULT MISMATCH in ${ workload.name } (${ mode }/${ name }): relative error ${ error }`);
        }
      }
      for (let i = 0; i < 4; i++) kernel.apply(null, workload.inputs[i % 2]);
      kernels[name] = kernel;
      samples[name] = [];
    }
    const runs = mode === 'cpu' ? MEDIAN_RUNS : MEDIAN_RUNS + 4;
    for (let round = 0; round < runs; round++) {
      const inputs = workload.inputs[round % 2];
      for (const name of names) {
        const start = process.hrtime.bigint();
        kernels[name].apply(null, inputs);
        samples[name].push(Number(process.hrtime.bigint() - start) / 1e6);
      }
    }
    const result = { error };
    for (const name of names) result[name] = +median(samples[name]).toFixed(2);
    return result;
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
      const result = kernel.apply(null, ATTRIBUTION.inputs[0]);
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

// Each workload is measured in a process of its own. Interleaving the three
// builds is enough to keep them honest against each other WITHIN a workload,
// but not across workloads: running the coordinate-heavy shape after six
// others once had V8 hand its un-optimized build a 2x tier-up the other two
// did not get, which read as the transform costing 11% when it is worth 1.8x
// measured alone. A fresh process per workload is what makes the table
// reproducible rather than order-dependent.
function measureWorkloadInChild(index) {
  const output = execFileSync(process.execPath, [scriptPath, `--workload=${ index }`], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'inherit'],
  });
  return JSON.parse(output);
}

function main() {
  const attributionOnly = process.argv.includes('--attribution');
  const modes = MODES.filter(([, supported]) => supported()).map(([mode]) => mode);
  const report = { optimizer: [], attribution: {} };

  const child = process.argv.find(argument => argument.startsWith('--workload='));
  if (child) {
    const workload = WORKLOADS[Number(child.split('=')[1])];
    const row = { name: workload.name, modes: {} };
    for (const mode of modes) row.modes[mode] = measure(mode, workload);
    process.stdout.write(JSON.stringify(row));
    return;
  }

  if (!attributionOnly) {
    for (let i = 0; i < WORKLOADS.length; i++) {
      const row = measureWorkloadInChild(i);
      for (const mode of modes) {
        const result = row.modes[mode];
        process.stderr.write(
          `${ row.name } / ${ mode }: off ${ result.disabled } ms, ` +
          `H+T1 ${ result.partial } ms, all ${ result.optimized } ms ` +
          `(${ (result.disabled / result.optimized).toFixed(2) }x total, ` +
          `${ (result.partial / result.optimized).toFixed(2) }x from T3)\n`);
      }
      report.optimizer.push(row);
    }

    // H and T1 land in one column because `loopUnrollLimit` is the only
    // per-transform switch the pass has: on the loop workloads that column is
    // H, and on the coordinate-heavy one -- which has no loop to hoist out of
    // -- it is T1.
    for (const mode of modes) {
      console.log(`\n### ${ mode }`);
      console.log('\n| Workload | off | H+T1 | all | H+T1 | T3 on top | total |');
      console.log('|---|---|---|---|---|---|---|');
      for (const row of report.optimizer) {
        const r = row.modes[mode];
        console.log(
          `| ${ row.name } | ${ r.disabled } ms | ${ r.partial } ms | ${ r.optimized } ms | ` +
          `${ (r.disabled / r.partial).toFixed(2) }× | ${ (r.partial / r.optimized).toFixed(2) }× | ` +
          `${ (r.disabled / r.optimized).toFixed(2) }× |`);
      }
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
