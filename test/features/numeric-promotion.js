const { assert, skip, test, module: describe } = require('qunit');
const { GPU } = require('../../src');

describe('features: numeric promotion');

// JavaScript has one number type: an integer combined with a fractional
// value yields a fractional result, whichever side the integer is on. The
// transpiler used to take the LEFT operand's type as the result type, so
// `this.thread.x * 0.5` became an integer expression that rounded the 0.5
// away -- disagreeing with `0.5 * this.thread.x`, the same multiplication.

const MODES = [
  ['cpu', true],
  ['webgl', GPU.isWebGLSupported],
  ['webgl2', GPU.isWebGL2Supported],
  ['headlessgl', GPU.isHeadlessGLSupported],
];

function eachMode(name, run) {
  for (const [mode, supported] of MODES) {
    (supported ? test : skip)(`${ name } ${ mode }`, assert => run(assert, mode));
  }
}

function values(gpu, kernelFunction, args) {
  const kernel = gpu.createKernel(kernelFunction).setOutput([4]).setLoopMaxIterations(10);
  return Array.from(kernel.apply(null, args || []));
}

eachMode('multiplication by a fraction commutes', (assert, mode) => {
  const gpu = new GPU({ mode });
  const expected = [0, 0.5, 1, 1.5];
  assert.deepEqual(values(gpu, function () { return this.thread.x * 0.5; }), expected, 'integer on the left');
  assert.deepEqual(values(gpu, function () { return 0.5 * this.thread.x; }), expected, 'integer on the right');
  gpu.destroy();
});

eachMode('addition of a fraction commutes', (assert, mode) => {
  const gpu = new GPU({ mode });
  const expected = [0.5, 1.5, 2.5, 3.5];
  assert.deepEqual(values(gpu, function () { return this.thread.x + 0.5; }), expected, 'integer on the left');
  assert.deepEqual(values(gpu, function () { return 0.5 + this.thread.x; }), expected, 'integer on the right');
  gpu.destroy();
});

eachMode('subtraction keeps the fraction', (assert, mode) => {
  const gpu = new GPU({ mode });
  assert.deepEqual(
    values(gpu, function () { return this.thread.x - 0.25; }),
    [-0.25, 0.75, 1.75, 2.75]);
  gpu.destroy();
});

eachMode('a fractional variable promotes too', (assert, mode) => {
  // not just literals: any Number-typed value on the right
  const gpu = new GPU({ mode });
  assert.deepEqual(
    values(gpu, function () {
      const half = 0.5;
      return this.thread.x * half;
    }),
    [0, 0.5, 1, 1.5]);
  gpu.destroy();
});

eachMode('whole-number arithmetic stays exact', (assert, mode) => {
  // the promotion must not disturb integer math -- indices depend on it
  const gpu = new GPU({ mode });
  assert.deepEqual(values(gpu, function () { return this.thread.x * 2; }), [0, 2, 4, 6]);
  assert.deepEqual(
    values(gpu, function (v) { return v[this.thread.x * 2]; }, [[0, 10, 20, 30, 40, 50, 60, 70]]),
    [0, 20, 40, 60],
    'still usable as an index');
  gpu.destroy();
});

eachMode('a fractional loop bound is not truncated', (assert, mode) => {
  // `i < 2.5` runs three times in JavaScript; casting the bound to int ran
  // it twice
  const gpu = new GPU({ mode });
  assert.deepEqual(
    values(gpu, function (limit) {
      let count = 0;
      for (let i = 0; i < limit; i++) {
        count++;
      }
      return count;
    }, [2.5]),
    [3, 3, 3, 3]);
  gpu.destroy();
});

eachMode('comparison against a fraction does not round', (assert, mode) => {
  const gpu = new GPU({ mode });
  assert.deepEqual(
    values(gpu, function () { return this.thread.x > 1.5 ? 1 : 0; }),
    [0, 0, 1, 1]);
  assert.deepEqual(
    values(gpu, function () { return this.thread.x < 1.5 ? 1 : 0; }),
    [1, 1, 0, 0]);
  gpu.destroy();
});
