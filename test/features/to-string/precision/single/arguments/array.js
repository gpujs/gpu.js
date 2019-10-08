const { assert, skip, test, module: describe, only } = require('qunit');
const { GPU } = require('../../../../../../src');

describe('feature: to-string single precision arguments Array');

function testArgument(mode, context, canvas) {
  const gpu = new GPU({ mode });
  const originalKernel = gpu.createKernel(function(a) {
    return a[this.thread.x];
  }, {
    canvas,
    context,
    output: [4],
    precision: 'single',
  });

  const a = [1, 2, 3, 4];
  const expected = new Float32Array([1,2,3,4]);
  const originalResult = originalKernel(a);
  assert.deepEqual(originalResult, expected);
  const kernelString = originalKernel.toString(a);
  const newKernel = new Function('return ' + kernelString)()({ context });
  const newResult = newKernel(a);
  assert.deepEqual(newResult, expected);

  const b = [4,3,2,1];
  const expected2 = new Float32Array([4,3,2,1]);
  const newResult2 = newKernel(b);
  assert.deepEqual(newResult2, expected2);
  gpu.destroy();
}

(GPU.isSinglePrecisionSupported && GPU.isWebGLSupported ? test : skip)('webgl', () => {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('webgl');
  testArgument('webgl', context, canvas);
});

(GPU.isSinglePrecisionSupported && GPU.isWebGL2Supported ? test : skip)('webgl2', () => {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('webgl2');
  testArgument('webgl2', context, canvas);
});

(GPU.isSinglePrecisionSupported && GPU.isHeadlessGLSupported ? test : skip)('headlessgl', () => {
  testArgument('headlessgl', require('gl')(1, 1), null);
});

test('cpu', () => {
  testArgument('cpu');
});
