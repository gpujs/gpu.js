const { assert, skip, test, module: describe } = require('qunit');
const { GPU, input } = require('../../../src');

describe('features: optimizer parity');

// THE gate for the compiler optimizations: every kernel below is built twice
// on the SAME backend -- once normally, once with `_optimizerDisabled` -- and
// the two results must agree BIT FOR BIT. Not approximately, and not across
// backends: cpu computes in f64 and everything else in f32, so cross-backend
// agreement is a different (and looser) question that other suites already
// ask. What this file proves is that turning the optimizer on changes nothing
// a caller can observe.
//
// The table is the point. A transform lands with rows here, not with rows in
// its own file: a shape that only the unroller touches still has to survive
// hoisting and inlining, and the cheapest way to keep that true is for every
// phase to add cases to one battery every phase runs.
//
// Rows cover the spec's shapes (hot-loop reads, helpers, tiny literal loops,
// stencils, and a control with none of it) crossed with the settings that
// change emission -- strictIntegers, fixIntegerDivisionAccuracy, seeded
// random, sub-kernels, Input arguments, dynamic output and dynamic arguments
// -- plus the #865/#867 control-flow shapes, which are exactly the places a
// naive hoist or unroll would change when something runs.

const MODES = [
  ['cpu', () => true],
  ['webgl', () => GPU.isWebGLSupported],
  ['webgl2', () => GPU.isWebGL2Supported],
  ['headlessgl', () => GPU.isHeadlessGLSupported],
  ['webasm', () => GPU.isWebAssemblySupported],
];

// navigator.gpu can be present with no adapter (headless Chromium, blocklisted
// GPUs); QUnit cannot skip at runtime, so an adapterless environment records a
// pass with an explicit message and bumps a counter the headed canary rejects.
let adapterPromise = null;
async function webgpuAdapter(assert) {
  if (!adapterPromise) adapterPromise = navigator.gpu.requestAdapter();
  const adapter = await adapterPromise;
  if (!adapter) {
    if (typeof window !== 'undefined') {
      window.__webgpuRuntimeSkips = (window.__webgpuRuntimeSkips || 0) + 1;
    }
    assert.ok(true, 'navigator.gpu present but no adapter (headless/blocklisted) — runtime skip');
  }
  return adapter;
}

/**
 * Every number a kernel call produced, in order, whatever container it came
 * back in -- a typed array, nested rows, or a kernel map's named results.
 */
function flattenValues(result, out) {
  if (result === null || result === undefined) return out;
  if (typeof result === 'number') {
    out.push(result);
    return out;
  }
  if (typeof result.length === 'number') {
    for (let i = 0; i < result.length; i++) flattenValues(result[i], out);
    return out;
  }
  const names = Object.keys(result).sort();
  for (let i = 0; i < names.length; i++) flattenValues(result[names[i]], out);
  return out;
}

/**
 * The comparison is on the bits, never on the values: `===` on numbers calls
 * NaN unequal to itself and -0 equal to 0, and both of those are differences
 * a caller can see. Doubles rather than floats so a cpu result is compared at
 * the precision it was computed at, not at the precision that would hide a
 * disagreement.
 */
function bitsOf(values) {
  const doubles = new Float64Array(values.length);
  doubles.set(values);
  return new Int32Array(doubles.buffer);
}

/**
 * Backends whose emitted program is handed to a compiler WE do not own, and
 * which is licensed to reassociate float arithmetic (GLSL ES 4.1.4 lets an
 * implementation carry an operation out at higher precision, and every shader
 * compiler in the fleet algebraically simplifies). Semantically identical
 * source is not enough to pin the bits there: hoisting `a[x]` out of
 * `s += a[x] * (i + 1)` lets the driver factor the unrolled sum into `x * 10`
 * where four separate fetches kept it as four adds -- measured at one f32 ULP
 * on headless-gl. That is the driver reassociating, not the pass: the pass
 * itself never reassociates and never CSEs across a float operation.
 *
 * cpu and webasm have no such licence. Emitted JavaScript runs under IEEE-754
 * with no reassociation, and wasm f32/f64 opcodes are exactly specified, so
 * those two are held to the bit.
 */
const driverMayReassociate = ['webgl', 'webgl2', 'headlessgl', 'webgpu'];

// one f32 ULP is 6e-8 relative; this is a few of them, and about ten times
// tighter than the tolerance the cross-backend suites use
const REASSOCIATION_TOLERANCE = 1e-6;

function assertParity(assert, optimized, disabled, mode, label) {
  const left = flattenValues(optimized, []);
  const right = flattenValues(disabled, []);
  assert.equal(left.length, right.length, `${ label }: result length`);
  if (left.length !== right.length) return;

  const leftBits = bitsOf(left);
  const rightBits = bitsOf(right);
  let firstDifferent = -1;
  for (let i = 0; i < leftBits.length; i++) {
    if (leftBits[i] !== rightBits[i]) {
      firstDifferent = i >> 1;
      break;
    }
  }
  if (firstDifferent === -1) {
    assert.ok(true, `${ label }: ${ left.length } values bit-identical`);
    return;
  }
  if (driverMayReassociate.indexOf(mode) === -1) {
    assert.ok(false,
      `${ label }: cell ${ firstDifferent } differs — optimized ${ left[firstDifferent] }, ` +
      `disabled ${ right[firstDifferent] }`);
    return;
  }
  let worst = 0;
  let worstCell = 0;
  for (let i = 0; i < left.length; i++) {
    // floored at 1: a sum whose terms cancel to near zero has no meaningful
    // relative scale, and the question here is the size of the drift
    const scale = Math.max(Math.abs(left[i]), Math.abs(right[i]), 1);
    const error = Math.abs(left[i] - right[i]) / scale;
    if (error > worst) {
      worst = error;
      worstCell = i;
    }
  }
  assert.ok(worst <= REASSOCIATION_TOLERANCE,
    `${ label }: shader compiler reassociated (worst relative ${ worst.toExponential(2) } at cell ` +
    `${ worstCell }: optimized ${ left[worstCell] }, disabled ${ right[worstCell] })`);
}

// ------------------------------------------------------------------- shapes

function poly(x) {
  return x * x * 0.5 + x * 0.25 - 0.125;
}

function scale(x, by) {
  return poly(x) * by;
}

const VECTOR = [];
for (let i = 0; i < 16; i++) VECTOR.push(((i * 13) % 100) / 50 - 1);

const MATRIX = [];
for (let y = 0; y < 8; y++) {
  const row = [];
  for (let x = 0; x < 8; x++) row.push(((x * 31 + y * 17) % 100) / 100);
  MATRIX.push(row);
}

const CASES = [
  {
    name: 'H: invariant read in a hot loop',
    kernel: function (a) {
      let s = 0;
      for (let i = 0; i < 4; i++) s += a[this.thread.x] * (i + 1);
      return s;
    },
    output: [16],
    calls: [{ args: [VECTOR] }],
  },
  {
    name: 'H: invariant constant read in a hot loop',
    kernel: function (a) {
      let s = 0;
      for (let i = 0; i < 6; i++) {
        s += a[this.thread.x] * this.constants.m[2][3] + i;
      }
      return s;
    },
    output: [16],
    settings: { constants: { m: MATRIX } },
    calls: [{ args: [VECTOR] }],
  },
  {
    name: 'H: mixed invariant and varying subscripts',
    kernel: function (a, b) {
      let s = 0;
      for (let i = 0; i < 8; i++) {
        s += a[this.thread.y][i] * b[3][this.thread.x];
      }
      return s;
    },
    output: [8, 8],
    calls: [{ args: [MATRIX, MATRIX] }],
  },
  {
    name: 'H: read invariant to a whole loop nest',
    kernel: function (a) {
      let s = 0;
      for (let y = 0; y < 3; y++) {
        for (let x = 0; x < 3; x++) {
          s += a[1][2] + y * 0.5 + x * 0.25;
        }
      }
      return s;
    },
    output: [8, 8],
    calls: [{ args: [MATRIX] }],
  },
  {
    name: 'H bail: read under a conditional',
    kernel: function (a) {
      let s = 0;
      for (let i = 0; i < 8; i++) {
        if (i > this.thread.x) {
          s += a[1][2];
        }
      }
      return s;
    },
    output: [8, 8],
    calls: [{ args: [MATRIX] }],
  },
  {
    // the read is invariant and unconditional, but a cell whose loop runs zero
    // times never performs it -- and on cpu a two-level read past the end
    // THROWS rather than reading a clamped texel. Hoisting it out of a loop
    // with no provable first iteration would turn a working kernel into a
    // crash, which is the one difference bigger than a bit.
    name: 'H bail: out-of-range read in a loop that may not run',
    kernel: function (a) {
      let s = 0;
      for (let i = 0; i < this.thread.x; i++) {
        s += a[this.thread.x + 100][2];
      }
      return s;
    },
    output: [1],
    settings: { loopMaxIterations: 10 },
    calls: [{ args: [[[1, 2, 3], [4, 5, 6], [7, 8, 9]]] }],
    modes: ['cpu'],
  },
  {
    // an out-of-range read the guard keeps the un-optimized build from ever
    // performing; hoisting past the guard reads it for every cell
    name: 'H bail: out-of-range read under a guard',
    kernel: function (a) {
      let s = 0;
      for (let i = 0; i < 4; i++) {
        if (this.thread.x < 0) {
          s += a[this.thread.x + 100][2];
        }
      }
      return s;
    },
    output: [3],
    calls: [{ args: [[[1, 2, 3], [4, 5, 6], [7, 8, 9]]] }],
    modes: ['cpu'],
  },
  {
    name: 'H bail: subscript assigned in the body',
    kernel: function (a) {
      let k = 0;
      let s = 0;
      for (let i = 0; i < 8; i++) {
        s += a[1][k];
        k = (k + 1) % 8;
      }
      return s;
    },
    output: [8, 8],
    calls: [{ args: [MATRIX] }],
  },
  {
    name: 'H bail: reassigned array argument (#865)',
    kernel: function (b, a) {
      a = b;
      let s = 0;
      for (let i = 0; i < 4; i++) s += a[this.thread.x];
      return s;
    },
    output: [8],
    calls: [{ args: [VECTOR, VECTOR.slice().reverse()] }],
    // reassigning an ARRAY argument is a cpu-only shape: the GL backends bind
    // arrays as samplers and webasm as memory views, neither assignable (#865)
    modes: ['cpu'],
  },
  {
    name: 'H bail: early return inside the loop (#865)',
    kernel: function (a) {
      for (let i = 0; i < 20; i++) {
        if (i * i > this.thread.x) {
          return i * 100 + a[1][2];
        }
      }
      return -1;
    },
    output: [8, 8],
    settings: { loopMaxIterations: 30 },
    calls: [{ args: [MATRIX] }],
  },
  {
    name: 'do-while with continue (#865)',
    kernel: function (a) {
      let i = 0;
      let acc = 0;
      do {
        i++;
        if (i % 3 === 0) continue;
        acc += i + a[1][2];
      } while (i < 12);
      return acc;
    },
    output: [8],
    settings: { loopMaxIterations: 30 },
    calls: [{ args: [MATRIX] }],
  },
  {
    name: 'while loop with an invariant read',
    kernel: function (a) {
      let i = 0;
      let s = 0;
      while (i < 6) {
        s += a[this.thread.x] * 2;
        i++;
      }
      return s;
    },
    output: [16],
    settings: { loopMaxIterations: 30 },
    calls: [{ args: [VECTOR] }],
  },
  {
    name: 'assigning to a scalar argument (#867)',
    kernel: function (base, a) {
      base = base + this.thread.x;
      let s = 0;
      for (let i = 0; i < 4; i++) s += a[this.thread.x] * base;
      return s;
    },
    output: [16],
    calls: [{ args: [10, VECTOR] }],
    // the webgpu backend binds scalar arguments as uniform params and has no
    // per-cell shadow for them yet, so this shape does not build there at all
    // -- with the optimizer on or off
    modes: ['cpu', 'webgl', 'webgl2', 'headlessgl', 'webasm'],
  },
  {
    name: 'switch/case in the loop body (#855)',
    kernel: function (a) {
      let s = 0;
      for (let i = 0; i < 4; i++) {
        switch (i) {
          case 0:
            s += a[this.thread.x];
            break;
          case 1:
            s += a[this.thread.x] * 2;
            break;
          default:
            s -= 1;
        }
      }
      return s;
    },
    output: [16],
    calls: [{ args: [VECTOR] }],
  },
  {
    name: 'T2 shape: helper in a hot loop',
    kernel: function (a) {
      let s = 0;
      for (let i = 0; i < 8; i++) s += poly(a[this.thread.x] + i * 0.01);
      return s;
    },
    output: [16],
    settings: { functions: [poly] },
    calls: [{ args: [VECTOR] }],
  },
  {
    name: 'T2 shape: helper calling helper',
    kernel: function (a) {
      let s = 0;
      for (let i = 0; i < 4; i++) s += scale(a[this.thread.x], i + 1);
      return s;
    },
    output: [16],
    settings: { functions: [poly, scale] },
    calls: [{ args: [VECTOR] }],
  },
  {
    name: 'T3 shape: literal 3-trip loop',
    kernel: function (a) {
      let s = 0;
      for (let i = 0; i < 3; i++) s += a[this.thread.x] * (i + 1) + i;
      return s;
    },
    output: [16],
    calls: [{ args: [VECTOR] }],
  },
  {
    name: 'T3 shape: literal loop above the unroll limit',
    kernel: function (a) {
      let s = 0;
      for (let i = 0; i < 32; i++) s += a[this.thread.x] * 0.5 + i;
      return s;
    },
    output: [16],
    calls: [{ args: [VECTOR] }],
  },
  {
    name: 'stencil 3x3',
    kernel: function (a) {
      let s = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const y = Math.min(Math.max(this.thread.y + dy, 0), 7);
          const x = Math.min(Math.max(this.thread.x + dx, 0), 7);
          s += a[y][x];
        }
      }
      return s / 9;
    },
    output: [8, 8],
    calls: [{ args: [MATRIX] }],
  },
  {
    name: 'control: no loops, no helpers',
    kernel: function (a) {
      const x = a[this.thread.x];
      return x * x * 0.5 + Math.sqrt(Math.abs(x)) - x * 0.25;
    },
    output: [16],
    calls: [{ args: [VECTOR] }],
  },
  {
    name: 'strictIntegers',
    kernel: function (a, n) {
      let s = 0;
      for (let i = 0; i < 4; i++) s += a[this.thread.x] * n + i;
      return s;
    },
    output: [16],
    settings: { strictIntegers: true, argumentTypes: ['Array', 'Integer'] },
    calls: [{ args: [VECTOR, 3] }],
  },
  {
    name: 'fixIntegerDivisionAccuracy',
    kernel: function (a) {
      let s = 0;
      for (let i = 1; i < 5; i++) s += a[this.thread.x] / i + this.thread.x / i;
      return s;
    },
    output: [16],
    settings: { fixIntegerDivisionAccuracy: true },
    calls: [{ args: [VECTOR] }],
  },
  {
    name: 'Input argument',
    kernel: function (a) {
      let s = 0;
      for (let i = 0; i < 4; i++) s += a[1][2] + a[this.thread.y][this.thread.x] * i;
      return s;
    },
    output: [8, 8],
    settings: { argumentTypes: ['Input'] },
    calls: [{ args: [() => input(new Float32Array(64).map((v, i) => (i % 17) / 17), [8, 8])] }],
  },
  {
    name: 'dynamic output',
    kernel: function (a) {
      let s = 0;
      for (let i = 0; i < 4; i++) s += a[0] * i + this.output.x;
      return s;
    },
    output: [8],
    settings: { dynamicOutput: true },
    calls: [
      { args: [VECTOR] },
      { output: [12], args: [VECTOR] },
    ],
  },
  {
    name: 'dynamic arguments',
    kernel: function (a) {
      let s = 0;
      for (let i = 0; i < 4; i++) s += a[1] * i + a[this.thread.x % 4];
      return s;
    },
    output: [8],
    settings: { dynamicArguments: true },
    calls: [
      { args: [VECTOR.slice(0, 8)] },
      { args: [VECTOR.slice(0, 12)] },
    ],
  },
  {
    name: 'sub-kernels',
    kernel: function (a) {
      let s = 0;
      for (let i = 0; i < 4; i++) s += a[this.thread.x] * (i + 1);
      subKernelDouble(a[this.thread.x]);
      return s;
    },
    subKernels: { doubled: function subKernelDouble(v) { return v * 2; } },
    output: [16],
    calls: [{ args: [VECTOR] }],
    // the webgpu backend does not implement createKernelMap; webasm degrades
    // to cpu for it, which is still an optimized-vs-disabled comparison
    modes: ['cpu', 'webgl', 'webgl2', 'headlessgl', 'webasm'],
  },
  {
    name: 'Array(3) return type',
    kernel: function (a) {
      let s = 0;
      for (let i = 0; i < 4; i++) s += a[this.thread.x] * (i + 1);
      return [s, s * 2, s * 0.5];
    },
    output: [16],
    settings: { precision: 'single' },
    calls: [{ args: [VECTOR] }],
  },
  {
    name: 'seeded random in a hot loop',
    kernel: function (a) {
      let s = 0;
      for (let i = 0; i < 4; i++) s += Math.random() * a[this.thread.x];
      return s;
    },
    output: [16],
    settings: { randomSeed: 42 },
    calls: [{ args: [VECTOR] }],
    // cpu's Math.random is unseeded by design, so two cpu builds cannot agree
    // on a random stream and the row would be testing the RNG, not the pass
    modes: ['webgl', 'webgl2', 'headlessgl', 'webasm', 'webgpu'],
  },
  {
    name: 'seeded random inside a helper',
    kernel: function (a) {
      let s = 0;
      for (let i = 0; i < 4; i++) s += jitter(a[this.thread.x]);
      return s;
    },
    settings: {
      randomSeed: 7,
      functions: [function jitter(v) { return v + Math.random() * 0.5; }],
    },
    output: [16],
    calls: [{ args: [VECTOR] }],
    // the GL backends cannot compile Math.random() inside a user helper at
    // all today -- the plugin's `random()` is only in scope in the kernel
    // body -- so the seeded-draw-order question can only be asked where the
    // shape builds. Inlining (T2) is what will make it buildable on GL.
    modes: ['webasm', 'webgpu'],
  },
  {
    name: 'minified source, comma-folded',
    // exactly what a bundler emits: statement sequences folded into commas and
    // an if folded into a short circuit. De-minification runs before the
    // optimizer, so the pass must see plain statements here.
    kernel: 'function(a){let s=0,i=0;for(i=0;i<4;i++)s+=a[this.thread.x]*(i+1),i%2===0&&(s+=1);return s}',
    output: [16],
    calls: [{ args: [VECTOR] }],
    // webgpu is the backend that hoists a comma for-init out of the header,
    // and its astForStatement then reads the init it just nulled -- a
    // pre-existing crash on this shape, optimizer or no optimizer
    modes: ['cpu', 'webgl', 'webgl2', 'headlessgl', 'webasm'],
  },
];

// ------------------------------------------------------------------- runner

function makeKernel(gpu, spec, disabled) {
  const settings = Object.assign(
    { output: spec.output },
    spec.settings || {},
    { _optimizerDisabled: disabled });
  if (spec.subKernels) {
    return gpu.createKernelMap(spec.subKernels, spec.kernel, settings);
  }
  return gpu.createKernel(spec.kernel, settings);
}

function resolveArgs(args) {
  return args.map(argument => (typeof argument === 'function' ? argument() : argument));
}

/**
 * Builds one side and runs every call, keeping a build failure rather than
 * throwing it: a shape a device cannot compile at all (no draw buffers, no
 * float textures) fails identically with the optimizer on and off, and that
 * says nothing about the optimizer. A failure on ONE side only is the whole
 * point of this file and stays a failure.
 */
async function collect(gpu, spec, disabled) {
  const results = [];
  try {
    const kernel = makeKernel(gpu, spec, disabled);
    for (let i = 0; i < spec.calls.length; i++) {
      const call = spec.calls[i];
      if (call.output) kernel.setOutput(call.output);
      results.push(await kernel.apply(null, resolveArgs(call.args)));
    }
    return { results, error: null, kernel: kernel.kernel };
  } catch (e) {
    return { results, error: e.message || String(e), kernel: null };
  }
}

async function runCase(assert, mode, spec) {
  const gpu = new GPU({ mode });
  try {
    const optimized = await collect(gpu, spec, false);
    const disabled = await collect(gpu, spec, true);

    if (optimized.error !== null || disabled.error !== null) {
      assert.equal(optimized.error, disabled.error,
        `${ spec.name } / ${ mode }: the optimizer decides nothing about whether this shape builds`);
      return;
    }

    // a build-time throw from the optimizer degrades to an un-optimized
    // build (#868), which would make every row below compare two identical
    // un-optimized kernels and pass for the wrong reason
    assert.notOk(optimized.kernel._optimizerDisabled,
      `${ spec.name } / ${ mode }: the optimized build stayed optimized ` +
      `(${ optimized.kernel.fallbackReason || 'no fallback' })`);

    for (let i = 0; i < optimized.results.length; i++) {
      assertParity(assert, optimized.results[i], disabled.results[i], mode,
        `${ spec.name } / ${ mode } / call ${ i }`);
    }
  } finally {
    await gpu.destroy();
  }
}

for (let c = 0; c < CASES.length; c++) {
  const spec = CASES[c];
  for (let m = 0; m < MODES.length; m++) {
    const [mode, supported] = MODES[m];
    const applies = !spec.modes || spec.modes.indexOf(mode) > -1;
    const runner = applies && supported() ? test : skip;
    runner(`${ spec.name } ${ mode }`, assert => runCase(assert, mode, spec));
  }
  const webgpuApplies = !spec.modes || spec.modes.indexOf('webgpu') > -1;
  (webgpuApplies && GPU.isWebGPUSupported ? test : skip)(`${ spec.name } webgpu`, async assert => {
    if (!(await webgpuAdapter(assert))) return;
    return runCase(assert, 'webgpu', spec);
  });
}
