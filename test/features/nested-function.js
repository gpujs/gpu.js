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

function testNestedInCustomFunction(mode) {
  function custom1() {
    function nested1() {
      return 1;
    }

    return nested1();
  }
  const gpu = new GPU({ mode });
  gpu.addFunction(custom1);
  const kernel = gpu.createKernel(function() {
    return custom1();
  }, { output: [1] });
  assert.deepEqual(kernel(), new Float32Array([1]));
  gpu.destroy();
}

test('nested in custom auto', () => {
  testNestedInCustomFunction();
});

test('nested in custom gpu', () => {
  testNestedInCustomFunction('gpu');
});

(GPU.isWebGLSupported ? test : skip)('nested in custom webgl', () => {
  testNestedInCustomFunction('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('nested in custom webgl2', () => {
  testNestedInCustomFunction('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('nested in custom headlessgl', () => {
  testNestedInCustomFunction('headlessgl');
});

test('nested in custom cpu', () => {
  testNestedInCustomFunction('cpu');
});
