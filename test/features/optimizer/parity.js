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

function outer(x) {
  return scale(x, 2) + 1;
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
    name: 'T3: exactly at the unroll limit',
    kernel: function (a) {
      let s = 0;
      for (let i = 0; i < 8; i++) s += a[i] * (i + 1);
      return s;
    },
    output: [16],
    calls: [{ args: [VECTOR] }],
  },
  {
    name: 'T3: one trip past the unroll limit',
    kernel: function (a) {
      let s = 0;
      for (let i = 0; i < 9; i++) s += a[i] * (i + 1);
      return s;
    },
    output: [16],
    calls: [{ args: [VECTOR] }],
  },
  {
    name: 'T3: a raised unroll limit',
    kernel: function (a) {
      let s = 0;
      for (let i = 0; i < 9; i++) s += a[i] * (i + 1);
      return s;
    },
    output: [16],
    settings: { loopUnrollLimit: 16 },
    calls: [{ args: [VECTOR] }],
  },
  {
    name: 'T3: unrolling turned off',
    kernel: function (a) {
      let s = 0;
      for (let i = 0; i < 4; i++) s += a[i] * (i + 1);
      return s;
    },
    output: [16],
    settings: { loopUnrollLimit: 0 },
    calls: [{ args: [VECTOR] }],
  },
  {
    name: 'T3: nested literal loops',
    kernel: function (a) {
      let s = 0;
      for (let y = 0; y < 3; y++) {
        for (let x = 0; x < 3; x++) {
          s += a[y][x] * (y + 1) - x * 0.25;
        }
      }
      return s;
    },
    output: [8, 8],
    calls: [{ args: [MATRIX] }],
  },
  {
    name: 'T3: a literal loop inside a helper',
    kernel: function (a) {
      return rowSum(a, this.thread.y) + a[this.thread.y][this.thread.x];
    },
    output: [8, 8],
    settings: {
      functions: [function rowSum(m, y) {
        let s = 0;
        for (let i = 0; i < 4; i++) s += m[y][i] * (i + 1);
        return s;
      }],
    },
    calls: [{ args: [MATRIX] }],
    enabledByInlining: ['webasm', 'webgpu'],
  },
  {
    name: 'T3: a counter counting down',
    kernel: function (a) {
      let s = 0;
      for (let i = 3; i > 0; i--) s += a[i] * i;
      return s;
    },
    output: [16],
    calls: [{ args: [VECTOR] }],
    // a decrementing counter does not compile on webgpu with the optimizer
    // OFF: the loop variable decays to `f32` and WGSL allows `--` only on an
    // integer scalar. Unrolling deletes the loop and the kernel then runs,
    // which is a difference in whether the shape builds at all -- a
    // pre-existing webgpu defect the optimizer happens to route around
    modes: ['cpu', 'webgl', 'webgl2', 'headlessgl', 'webasm'],
  },
  {
    // the subscript is arithmetic on the counter, so unrolling leaves an index
    // made only of numbers -- an integer context whose operands no longer say
    // so on their own
    name: 'T3: a negative counter, offset into the subscript',
    kernel: function (a) {
      let s = 0;
      for (let i = -2; i < 2; i++) s += a[i + 2] * i + a[2 - i] * 0.5;
      return s;
    },
    output: [16],
    calls: [{ args: [VECTOR] }],
  },
  {
    name: 'T3: a counter stepping by two',
    kernel: function (a) {
      let s = 0;
      for (let j = 0; j < 8; j += 2) s += a[j] * 0.5;
      return s;
    },
    output: [16],
    calls: [{ args: [VECTOR] }],
  },
  {
    name: 'T3: a switch on the counter',
    kernel: function (a) {
      let s = 0;
      for (let i = 0; i < 3; i++) {
        switch (i) {
          case 0:
            s += a[this.thread.x];
            break;
          case 1:
            s += a[this.thread.x] * 2;
            break;
          default:
            s -= 0.5;
        }
      }
      return s;
    },
    output: [16],
    calls: [{ args: [VECTOR] }],
  },
  {
    name: 'T3: an early return out of an unrolled iteration (#865)',
    kernel: function (a) {
      for (let i = 0; i < 4; i++) {
        if (a[i] > 0) return i * 10 + a[i];
      }
      return -1;
    },
    output: [16],
    calls: [{ args: [VECTOR] }],
  },
  {
    name: 'T3 bail: a break in the body',
    kernel: function (a) {
      let s = 0;
      for (let i = 0; i < 4; i++) {
        if (a[i] > 0.5) break;
        s += a[i];
      }
      return s;
    },
    output: [16],
    settings: { loopMaxIterations: 20 },
    calls: [{ args: [VECTOR] }],
  },
  {
    name: 'T3 bail: a body that writes the counter',
    kernel: function (a) {
      let s = 0;
      for (let i = 0; i < 6; i++) {
        s += a[i];
        if (a[i] < 0) i++;
      }
      return s;
    },
    output: [16],
    settings: { loopMaxIterations: 20 },
    calls: [{ args: [VECTOR] }],
  },
  {
    name: 'T3 bail: an inner loop shadowing the counter',
    kernel: function (a, n) {
      let s = 0;
      for (let i = 0; i < 3; i++) {
        for (let i = 0; i < n; i++) {
          s += a[i] * 0.5;
        }
      }
      return s;
    },
    output: [16],
    settings: { loopMaxIterations: 20, argumentTypes: ['Array', 'Integer'] },
    calls: [{ args: [VECTOR, 4] }],
  },
  {
    // `this.thread.x` names `x` as a FIELD, not as a variable; a substitution
    // that walks into a non-computed member's property rewrites it
    name: 'T3: a counter named for a coordinate',
    kernel: function (a) {
      let s = 0;
      for (let x = 0; x < 3; x++) {
        s += a[x] * this.thread.x + this.thread.y;
      }
      return s;
    },
    output: [8, 8],
    calls: [{ args: [MATRIX[0]] }],
  },
  {
    name: 'T3 bail: a fractional counter',
    kernel: function (a) {
      let s = 0;
      for (let t = 0; t < 1; t += 0.25) s += a[this.thread.x] * t;
      return s;
    },
    output: [16],
    settings: { loopMaxIterations: 20 },
    calls: [{ args: [VECTOR] }],
  },
  {
    name: 'T1: every coordinate read, on every rank',
    kernel: function (a) {
      return a[this.thread.z][this.thread.y][this.thread.x] * 2 +
        this.thread.x - this.thread.y * 0.5 + this.thread.z * 0.25;
    },
    output: [4, 4, 2],
    calls: [{ args: [[MATRIX.slice(0, 4), MATRIX.slice(4, 8)]] }],
  },
  {
    name: 'T1: a coordinate read inside a helper and in the body',
    kernel: function (a) {
      return column(a) + this.thread.x * 0.5;
    },
    output: [8, 8],
    settings: {
      functions: [function column(m) {
        return m[this.thread.y][this.thread.x];
      }],
    },
    calls: [{ args: [MATRIX] }],
    enabledByInlining: ['webasm', 'webgpu'],
  },
  {
    name: 'T1: coordinates, constants and output together',
    kernel: function (a) {
      let s = 0;
      for (let i = 0; i < 3; i++) {
        s += a[this.thread.y][this.thread.x] * this.constants.k[i] + this.output.x - this.thread.y;
      }
      return s;
    },
    output: [8, 8],
    settings: { constants: { k: [0.25, 0.5, 0.75] } },
    calls: [{ args: [MATRIX] }],
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
    // the same shape below the unroll limit, which is where the unroller would
    // reach it. The draw sequence is preserved either way -- same count, same
    // order -- but the GL lowering of Math.random is
    // `fract(sin(dot(...)) * 43758.5453)`, which turns one ULP of compiler
    // reassociation into a different number entirely. Measured 4.5e-4 apart on
    // ANGLE/Metal before the unroller learned to leave these loops alone.
    name: 'seeded random in a tiny literal loop',
    kernel: function (a) {
      let s = 0;
      for (let i = 0; i < 3; i++) s += Math.random() * a[this.thread.x] + i;
      return s;
    },
    output: [16],
    settings: { randomSeed: 11 },
    calls: [{ args: [VECTOR] }],
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
    // GL compiles this now: the random plugin is selected by matching the
    // kernel's source, and a helper added with addFunction is part of the same
    // shader but was never part of that match
    modes: ['webgl', 'webgl2', 'headlessgl', 'webasm', 'webgpu'],
  },

  // ------------------------------------------------------------- T2 battery
  //
  // The edge list the design contract names for inlining, one row each. A row
  // that must SKIP is here for the same reason as one that must transform: an
  // over-eager bail and an over-eager inline are both failures, and only the
  // pair of files can tell them apart -- this one says the answer did not
  // move, inlining.js says the emission did (or did not).
  {
    name: 'T2: helper calling helper, three deep',
    kernel: function (a) {
      return outer(a[this.thread.x]) + outer(a[0]);
    },
    output: [16],
    settings: { functions: [poly, scale, outer] },
    calls: [{ args: [VECTOR] }],
  },
  {
    name: 'T2: a parameter reassigned inside the helper',
    kernel: function (a) {
      return bump(a[this.thread.x]) + bump(a[this.thread.x] * 2);
    },
    output: [16],
    settings: {
      functions: [function bump(v) {
        v = v + 1;
        v *= 0.5;
        return v * v;
      }],
    },
    calls: [{ args: [VECTOR] }],
    // WGSL parameters are immutable, so the un-optimized build cannot compile
    // the assignment at all (#867's shape, one level in); inlining binds the
    // parameter as an ordinary mutable local
    enabledByInlining: ['webgpu'],
  },
  {
    name: 'T2: an array argument, aliased into both parameters',
    kernel: function (a) {
      return blend(a, a, this.thread.x);
    },
    output: [16],
    settings: {
      functions: [function blend(m, n, k) {
        return m[k] * 0.25 + n[(k + 1) % 16] * 0.75;
      }],
    },
    calls: [{ args: [VECTOR] }],
    // an array parameter is a hard error on webasm AND webgpu; inlining
    // removes the parameter, so this is a shape T2 makes buildable
    enabledByInlining: ['webasm', 'webgpu'],
  },
  {
    name: 'T2: helper locals shadowing kernel locals',
    kernel: function (a) {
      const v = a[this.thread.x];
      const t = v * 2;
      const s = shadowy(v) + shadowy(t);
      return s + v + t;
    },
    output: [16],
    settings: {
      functions: [function shadowy(v) {
        const t = v * 3;
        const s = t + v;
        return s * t;
      }],
    },
    calls: [{ args: [VECTOR] }],
  },
  {
    name: 'T2: an early return inside a helper',
    kernel: function (a) {
      return clampish(a[this.thread.x]) + clampish(a[this.thread.x] - 0.5);
    },
    output: [16],
    settings: {
      functions: [function clampish(v) {
        if (v < 0) return 0;
        if (v > 0.5) return 1;
        return v * 2;
      }],
    },
    calls: [{ args: [VECTOR] }],
  },
  {
    name: 'T2 skip: a return this pass cannot fold to an expression',
    kernel: function (a) {
      return firstOver(a, this.thread.x * 0.05);
    },
    output: [16],
    settings: {
      functions: [function firstOver(m, limit) {
        for (let i = 0; i < 8; i++) {
          if (m[i] > limit) return i;
        }
        return -1;
      }],
    },
    calls: [{ args: [VECTOR] }],
    // the helper survives, so its array parameter still cannot be emitted on
    // webasm -- identically on both sides, which is what the row asserts
    modes: ['cpu', 'webgl', 'webgl2', 'headlessgl', 'webgpu'],
  },
  {
    name: 'T2 skip: an early return whose branches draw',
    // folding this to a conditional would be wrong on webasm's vector path,
    // which evaluates BOTH sides of a conditional for every lane before
    // selecting -- so a draw in the untaken branch would advance a stream the
    // function never touched
    kernel: function (a) {
      return maybeDraw(a[this.thread.x]) + Math.random();
    },
    output: [16],
    settings: {
      randomSeed: 5,
      functions: [function maybeDraw(v) {
        if (v < 0) return Math.random();
        return v * 2;
      }],
    },
    calls: [{ args: [VECTOR] }],
    modes: ['webgl', 'webgl2', 'headlessgl', 'webasm', 'webgpu'],
  },
  {
    name: 'T2 skip: a call in a conditional operand',
    kernel: function (a) {
      return this.thread.x > 4 ? poly(a[this.thread.x]) : poly(a[0]);
    },
    output: [16],
    settings: { functions: [poly] },
    calls: [{ args: [VECTOR] }],
  },
  {
    name: 'T2 skip: a call after an update in the same statement',
    kernel: function (a) {
      let k = 0;
      let s = 0;
      s += a[k++] * poly(a[this.thread.x]);
      return s + k;
    },
    output: [16],
    settings: { functions: [poly] },
    calls: [{ args: [VECTOR] }],
  },
  {
    name: 'T2: seeded random inside a helper, scalar and vector dispatch',
    // 6 wide: webasm runs a vector span plus a scalar tail per row, so both
    // dispatch paths draw from the same seeded stream in one run. That is the
    // sharpest edge in the feature -- un-inlined, a helper's draws come from
    // the scalar PCG with per-lane state swapped around the call; inlined,
    // they come from the vector PCG directly
    kernel: function (a) {
      const p = Math.random();
      const q = jitter(a[this.thread.x % 8]);
      return p + q + Math.random();
    },
    output: [6, 4],
    settings: {
      randomSeed: 1234,
      functions: [function jitter(v) { return v + Math.random() * 0.5; }],
    },
    calls: [{ args: [VECTOR] }],
    modes: ['webgl', 'webgl2', 'headlessgl', 'webasm', 'webgpu'],
  },
  {
    name: 'T2: seeded random in a helper under a branch',
    kernel: function (a) {
      let s = a[this.thread.x % 8];
      if (this.thread.x % 2 === 0) {
        s += jitter(s);
      }
      return s + Math.random();
    },
    output: [7, 3],
    settings: {
      randomSeed: 99,
      functions: [function jitter(v) { return v + Math.random() * 0.5; }],
    },
    calls: [{ args: [VECTOR] }],
    modes: ['webgl', 'webgl2', 'headlessgl', 'webasm', 'webgpu'],
  },
  {
    name: 'T2: a sub-kernel calling a helper',
    kernel: function (a) {
      const v = poly(a[this.thread.x]);
      subPoly(a[this.thread.x] * 2);
      return v;
    },
    subKernels: { subPoly: function subPoly(v) { return poly(v) + 1; } },
    output: [16],
    settings: { functions: [poly] },
    calls: [{ args: [VECTOR] }],
    // kernel maps fall back to cpu on webasm, which would compare a cpu build
    // against a cpu build under a webasm label
    modes: ['cpu', 'webgl', 'webgl2', 'headlessgl', 'webgpu'],
  },
  {
    name: 'T2: a helper reading thread and constants',
    kernel: function (a) {
      return corner(a) + this.thread.x * 0.5;
    },
    output: [8, 8],
    settings: {
      constants: { k: 0.375 },
      functions: [function corner(m) {
        return m[this.thread.y][this.thread.x] * this.constants.k;
      }],
    },
    calls: [{ args: [MATRIX] }],
    enabledByInlining: ['webasm', 'webgpu'],
  },
  {
    name: 'T2: an Integer-typed argument through a helper',
    // the binding a non-atom argument gets is typed from the argument, and an
    // integer expression that is not a member read declares as a float. Whole
    // numbers survive that round trip exactly at these magnitudes; the row is
    // here so a change to that reasoning shows up as a failure
    kernel: function (a) {
      return pick(a, Math.floor(this.thread.x / 2) + 1) + pick(a, this.thread.x);
    },
    output: [16],
    settings: {
      functions: [function pick(m, k) {
        return m[k % 16] * (k + 1);
      }],
    },
    calls: [{ args: [VECTOR] }],
    enabledByInlining: ['webasm', 'webgpu'],
  },
  {
    name: 'T2: a void helper in statement position',
    kernel: function (a) {
      const v = a[this.thread.x];
      note(v);
      return v * 2;
    },
    output: [16],
    settings: {
      functions: [function note(v) {
        const unused = v * v + 1;
      }],
    },
    calls: [{ args: [VECTOR] }],
  },
  {
    name: 'T2 then T3: a helper carrying a tiny loop into a caller',
    kernel: function (a) {
      return rowish(a, this.thread.x) + a[this.thread.x];
    },
    output: [16],
    settings: {
      functions: [function rowish(m, k) {
        let s = 0;
        for (let i = 0; i < 3; i++) s += m[(k + i) % 16] * (i + 1);
        return s;
      }],
    },
    calls: [{ args: [VECTOR] }],
    enabledByInlining: ['webasm', 'webgpu'],
  },
  {
    name: 'T2 under strictIntegers and fixIntegerDivisionAccuracy',
    kernel: function (a) {
      return ratio(a[this.thread.x], this.thread.x + 1) + ratio(a[0], 4);
    },
    output: [16],
    settings: {
      strictIntegers: true,
      fixIntegerDivisionAccuracy: true,
      functions: [function ratio(v, d) {
        return v / d + (d % 3) * 0.5 + v / 2.5;
      }],
    },
    calls: [{ args: [VECTOR] }],
  },
  {
    name: 'T2 with a dynamic output and a helper',
    kernel: function (a) {
      return poly(a[this.thread.x % 8]) * this.output.x;
    },
    output: [8],
    settings: { functions: [poly], dynamicOutput: true },
    calls: [{ args: [VECTOR] }, { output: [16], args: [VECTOR] }],
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

    // T2 makes a few shapes compile that never compiled before -- a helper
    // taking an array argument is a hard error on webasm, and inlining leaves
    // no helper to take one. A row says so explicitly; the assertion still
    // fails if the disabled build starts working or the optimized one stops.
    const enabled = spec.enabledByInlining && spec.enabledByInlining.indexOf(mode) > -1;
    if (enabled && optimized.error === null && disabled.error !== null) {
      assert.ok(true, `${ spec.name } / ${ mode }: inlining makes this shape buildable ` +
        `(un-optimized: ${ disabled.error.split('\n')[0] })`);
      return;
    }
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
