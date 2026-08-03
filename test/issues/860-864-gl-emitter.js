const { assert, skip, test, module: describe } = require('qunit');
const { GPU } = require('../../src');

describe('issues #860 and #864');

const MODES = [
  ['cpu', true],
  ['webgl', GPU.isWebGLSupported],
  ['webgl2', GPU.isWebGL2Supported],
  ['headlessgl', GPU.isHeadlessGLSupported],
  ['webasm', GPU.isWebAssemblySupported],
];

function eachMode(name, run) {
  for (const [mode, supported] of MODES) {
    (supported ? test : skip)(`${ name } ${ mode }`, assert => run(assert, mode));
  }
}

// #860: for-loop init that is an expression, not a declaration. The GL
// emitters read init.declarations unconditionally and crashed; expression
// inits now hoist in front of the safe-wrapped loop form.

eachMode('Issue #860 - comma expression for-init', (assert, mode) => {
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function (a) {
    let s = 0;
    let i = 0;
    let j = 0;
    for (i = 0, j = 1; i < 4; i++) {
      s += a[j];
    }
    return s;
  }, { output: [4] });
  assert.deepEqual(Array.from(kernel([1, 2, 3, 4])), [8, 8, 8, 8]);
  gpu.destroy();
});

eachMode('Issue #860 - single assignment for-init', (assert, mode) => {
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function (a) {
    let s = 0;
    let i = 0;
    for (i = 1; i < 4; i++) {
      s += a[i];
    }
    return s;
  }, { output: [2] });
  assert.deepEqual(Array.from(kernel([1, 2, 3, 4])), [9, 9]);
  gpu.destroy();
});

eachMode('Issue #860 - assignment to a declared loop counter types as the declaration', (assert, mode) => {
  // the tracer types `i` as an integer loop counter, so its declaration is
  // `int user_i=0;` -- a standalone `i = 0` used to emit a float literal and
  // fail the shader compile
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function (a) {
    let s = 0;
    let i = 0;
    i = 0;
    for (; i < 4; i++) {
      s += a[i];
    }
    return s;
  }, { output: [2] });
  assert.deepEqual(Array.from(kernel([1, 2, 3, 4])), [10, 10]);
  gpu.destroy();
});

// #864: integer-valued numbers at 1e21 and beyond stringify in exponential
// form; appending .0 produced `1e+30.0`, invalid GLSL. The values below are
// compared against their f32 roundings since GL stores them as float32.

const F32 = value => Math.fround(value);

eachMode('Issue #864 - 1e30 literal in the kernel body', (assert, mode) => {
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function () {
    return 1e30;
  }, { output: [1] });
  assert.equal(kernel()[0], F32(1e30));
  gpu.destroy();
});

eachMode('Issue #864 - 1e21 literal, the exact toString boundary', (assert, mode) => {
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function () {
    return 1e21;
  }, { output: [1] });
  assert.equal(kernel()[0], F32(1e21));
  gpu.destroy();
});

eachMode('Issue #864 - 1e30 through setConstants', (assert, mode) => {
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function () {
    return this.constants.big * 1;
  }, { constants: { big: 1e30 }, output: [1] });
  assert.equal(kernel()[0], F32(1e30));
  gpu.destroy();
});

eachMode('Issue #864 - 1e20 and plain integers still render as digits', (assert, mode) => {
  const gpu = new GPU({ mode });
  const below = gpu.createKernel(function () {
    return 1e20;
  }, { output: [1] });
  assert.equal(below()[0], F32(1e20), '1e20 sits below the toString boundary');
  const plain = gpu.createKernel(function () {
    return 123456;
  }, { output: [1] });
  assert.equal(plain()[0], 123456);
  gpu.destroy();
});
