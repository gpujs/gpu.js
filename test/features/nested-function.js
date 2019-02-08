const { assert, skip, test, module: describe, only } = require('qunit');
const { GPU } = require('../../src');

describe('nested function');

function nestedSumABTest(mode) {
  const gpu = new GPU({ mode });
  const f = gpu.createKernel(function(a, b) {
    function custom_adder(a,b) {
      return a+b;
    }

    return custom_adder(a[this.thread.x], b[this.thread.x]);
  }, {
    output : [6]
  });

  assert.ok(f !== null, 'function generated test');

  const a = [1, 2, 3, 5, 6, 7];
  const b = [4, 5, 6, 1, 2, 3];

  const res = f(a,b);
  const exp = [5, 7, 9, 6, 8, 10];

  assert.deepEqual(Array.from(res), exp);
  gpu.destroy();
}

test('nested_sum auto', () => {
  nestedSumABTest(null);
});

test('nested_sum gpu', () => {
  nestedSumABTest('gpu');
});

(GPU.isWebGLSupported ? test : skip)('nested_sum webgl', () => {
  nestedSumABTest('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('nested_sum webgl2', () => {
  nestedSumABTest('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('nested_sum headlessgl', () => {
  nestedSumABTest('headlessgl');
});

test('nested_sum cpu', () => {
  nestedSumABTest('cpu');
});
