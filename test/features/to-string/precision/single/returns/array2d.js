const { assert, skip, test, module: describe, only } = require('qunit');
const { GPU } = require('../../../../../../src');

describe('feature: to-string single precision returns Array2D');

function testReturn(mode, context, canvas) {
  const gpu = new GPU({ mode });
  const originalKernel = gpu.createKernel(function(a, b) {
    return a[this.thread.x] + b[this.thread.y];
  }, {
    canvas,
    context,
    output: [2, 2],
    precision: 'single',
  });

  const a = [1, 2];
  const b = [2, 3];
  const expected = [
    new Float32Array([3, 4]),
    new Float32Array([4, 5]),
  ];
  const originalResult = originalKernel(a, b);
  assert.deepEqual(originalResult, expected);
  const kernelString = originalKernel.toString(a, b);
  const newResult = new Function('return ' + kernelString)()({ context })(a, b);
  assert.deepEqual(newResult, expected);
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
