const { assert, skip, test, module: describe, only } = require('qunit');
const { GPU } = require('../../../../../../src');
const { greenCanvas } = require('../../../../../browser-test-utils');

describe('feature: to-string single precision arguments HTMLCanvas');

function testArgument(mode, done) {
  const canvasInput1 = greenCanvas(mode, 1, 1);
  const canvasInput2 = greenCanvas(mode, 1, 1);
  const gpu = new GPU({mode});
  const originalKernel = gpu.createKernel(function (canvas1, canvas2) {
    const pixel1 = canvas1[this.thread.y][this.thread.x];
    const pixel2 = canvas2[this.thread.y][this.thread.x];
    return pixel1[1] + pixel2[1];
  }, {
    output: [1],
    precision: 'single',
    argumentTypes: ['HTMLCanvas', 'HTMLCanvas'],
  });
  const canvas = originalKernel.canvas;
  const context = originalKernel.context;
  assert.deepEqual(originalKernel(canvasInput1, canvasInput2)[0], 2);
  const kernelString = originalKernel.toString(canvasInput1, canvasInput2);
  const newKernel = new Function('return ' + kernelString)()({context, canvas});
  const canvasInput3 = greenCanvas(mode, 1, 1);
  const canvasInput4 = greenCanvas(mode, 1, 1);
  assert.deepEqual(newKernel(canvasInput3, canvasInput4)[0], 2);
  gpu.destroy();
}

(GPU.isSinglePrecisionSupported && GPU.isWebGLSupported ? test : skip)('webgl', () => {
  testArgument('webgl');
});

(GPU.isSinglePrecisionSupported && GPU.isWebGL2Supported ? test : skip)('webgl2', () => {
  testArgument('webgl2');
});


