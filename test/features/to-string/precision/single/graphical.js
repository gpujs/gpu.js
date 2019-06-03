const { assert, skip, test, module: describe, only } = require('qunit');
const { GPU } = require('../../../../../src');

describe('feature: to-string single precision graphical');

function testGraphical(mode, context, canvas) {
  const gpu = new GPU({ mode });
  const originalKernel = gpu.createKernel(function() {
    this.color(1,1,1,1);
  }, {
    canvas,
    context,
    output: [2,2],
    precision: 'single',
    graphical: true,
  });

  const expected = new Uint8ClampedArray([
    255, 255, 255, 255,
    255, 255, 255, 255,
    255, 255, 255, 255,
    255, 255, 255, 255,
  ]);
  originalKernel();
  assert.deepEqual(originalKernel.getPixels(), expected);
  const kernelString = originalKernel.toString();
  const newKernel = new Function('return ' + kernelString)()({ canvas, context });
  newKernel();
  assert.deepEqual(newKernel.getPixels(), expected);
  gpu.destroy();
}

(GPU.isSinglePrecisionSupported && GPU.isWebGLSupported ? test : skip)('webgl', () => {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('webgl');
  testGraphical('webgl', context, canvas);
});

(GPU.isSinglePrecisionSupported && GPU.isWebGL2Supported ? test : skip)('webgl2', () => {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('webgl2');
  testGraphical('webgl2', context, canvas);
});

(GPU.isSinglePrecisionSupported && GPU.isHeadlessGLSupported ? test : skip)('headlessgl', () => {
  testGraphical('headlessgl', require('gl')(1, 1), null);
});

(GPU.isCanvasSupported ? test : skip)('cpu', () => {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  testGraphical('cpu', context, canvas);
});
