const { assert, skip, test, module: describe, only } = require('qunit');
const { GPU } = require('../../../../../../dist/gpu.js');

describe('feature: to-string single precision arguments Array(3)');

function testArgument(mode, context, canvas) {
  const gpu = new GPU({ mode });
  const originalKernel = gpu.createKernel(function(a) {
    return a;
  }, {
    canvas,
    context,
    output: [1],
    precision: 'single',
    argumentTypes: { a: 'Array(3)' }
  });

  const a = new Float32Array([1, 2, 3]);
  const expected = [new Float32Array([1,2,3])];
  const originalResult = originalKernel(a);
  assert.deepEqual(originalResult, expected);
  const kernelString = originalKernel.toString(a);
  const newKernel = new Function('return ' + kernelString)()({ context });
  const newResult = newKernel(a);
  assert.deepEqual(newResult, expected);

  const b = new Float32Array([1, 1, 1]);
  const expected2 = [new Float32Array([1,1,1])];
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
