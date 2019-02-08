const { assert, skip, test, module: describe, only } = require('qunit');
const { GPU } = require('../../src');

describe('feature: Ternary');

function ternaryTest(mode) {
  const gpu = new GPU({ mode });
  function ternaryFunction(value) {
    return (value > 1 ? 1 : 0);
  }
  const kernel = gpu.createKernel(ternaryFunction, { output: [1] });
  const truthyResult = kernel(100);
  const falseyResult = kernel(-100);
  assert.equal(truthyResult[0], 1);
  assert.equal(falseyResult[0], 0);
  gpu.destroy();
}

test('auto', () => {
  ternaryTest();
});

test('gpu', () => {
  ternaryTest('gpu');
});

(GPU.isWebGLSupported ? test : skip)('webgl', () => {
  ternaryTest('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('webgl2', () => {
  ternaryTest('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('headlessgl', () => {
  ternaryTest('headlessgl');
});

test('cpu', () => {
  ternaryTest('cpu');
});
