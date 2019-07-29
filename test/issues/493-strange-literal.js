const { assert, skip, test, module: describe, only } = require('qunit');
const { GPU } = require('../../src');

describe('issue #493 - strange literal');

function testStrangeLiteral(mode) {
  const gpu = new GPU({ mode });
  function kernelFunction(array) {
    const xFactor = (1 - 0) * this.constants.x + this.thread.x * this.constants.y;
    const yFactor = (1 - .5) * this.constants.x + this.thread.x * this.constants.y;
    const value = array[this.thread.x];
    return [
      value[0] / xFactor,
      value[1] / yFactor,
    ];
  }
  const kernel1 = gpu.createKernel(kernelFunction)
    .setArgumentTypes({ array: 'Array1D(2)' })
    .setConstants({ x: 1, y: 1})
    .setOutput([1]);
  assert.deepEqual(kernel1([[1,2]]), [new Float32Array([1,4])]);
  const kernel2 = gpu.createKernel(kernelFunction)
    .setStrictIntegers(true)
    .setArgumentTypes({ array: 'Array1D(2)' })
    .setConstants({ x: 1, y: 1})
    .setOutput([1]);
  assert.deepEqual(kernel2([[1,2]]), [new Float32Array([1,4])]);
  gpu.destroy();
}

test('auto', () => {
  testStrangeLiteral();
});

test('gpu', () => {
  testStrangeLiteral('gpu');
});

(GPU.isWebGLSupported ? test : skip)('webgl', () => {
  testStrangeLiteral('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('webgl2', () => {
  testStrangeLiteral('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('headlessgl', () => {
  testStrangeLiteral('headlessgl');
});

test('cpu', () => {
  testStrangeLiteral('cpu');
});
