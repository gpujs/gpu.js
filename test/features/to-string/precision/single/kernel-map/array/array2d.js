const { assert, skip, test, module: describe, only } = require('qunit');
const { GPU } = require('../../../../../../../src');

describe('feature: to-string single precision array style kernel map returns 2D Array');

function testReturn(mode, context, canvas) {
  const gpu = new GPU({ mode });
  function addOne(value) {
    return value + 1;
  }
  const originalKernel = gpu.createKernelMap([addOne], function(a) {
    const result = a[this.thread.x] + 1;
    addOne(result);
    return result;
  }, {
    canvas,
    context,
    output: [2, 2],
    precision: 'single',
  });

  const a = [1, 2, 3, 4, 5, 6];
  const expected = [
    new Float32Array([2, 3]),
    new Float32Array([2, 3]),
  ];
  const expectedZero = [
    new Float32Array([3, 4]),
    new Float32Array([3, 4]),
  ];
  const originalResult = originalKernel(a);
  assert.deepEqual(originalResult.result, expected);
  assert.deepEqual(originalResult[0], expectedZero);
  const kernelString = originalKernel.toString(a);
  const newResult = new Function('return ' + kernelString)()({ context })(a);
  assert.deepEqual(newResult.result, expected);
  assert.deepEqual(newResult[0], expectedZero);
  gpu.destroy();
}

(GPU.isSinglePrecisionSupported && GPU.isWebGLSupported ? test : skip)('webgl', () => {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('webgl');
  testReturn('webgl', context, canvas);
});

(GPU.isSinglePrecisionSupported && GPU.isWebGL2Supported ? test : skip)('webgl2', () => {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('webgl2');
  testReturn('webgl2', context, canvas);
});

(GPU.isSinglePrecisionSupported && GPU.isHeadlessGLSupported ? test : skip)('headlessgl', () => {
  testReturn('headlessgl', require('gl')(1, 1), null);
});

test('cpu', () => {
  testReturn('cpu');
});
