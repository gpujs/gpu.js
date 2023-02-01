const { assert, skip, test, module: describe, only } = require('qunit');
const { GPU } = require('../../../../../..');
const { greenCanvas } = require('../../../../../browser-test-utils');

describe('feature: to-string unsigned precision constants HTMLCanvas');

function testArgument(mode, done) {
  const canvasInput1 = greenCanvas(mode, 1, 1);
  const canvasInput2 = greenCanvas(mode, 1, 1);
  const gpu = new GPU({ mode });
  const originalKernel = gpu.createKernel(
    function () {
      const pixel1 = this.constants.canvas1[this.thread.y][this.thread.x];
      const pixel2 = this.constants.canvas2[this.thread.y][this.thread.x];
      return pixel1[1] + pixel2[1];
    },
    {
      output: [1],
      precision: 'unsigned',
      constants: { canvas1: canvasInput1, canvas2: canvasInput2 },
    }
  );
  const canvas = originalKernel.canvas;
  const context = originalKernel.context;
  assert.deepEqual(originalKernel()[0], 2);
  const kernelString = originalKernel.toString();
  const canvasInput3 = greenCanvas(mode, 1, 1);
  const canvasInput4 = greenCanvas(mode, 1, 1);
  const newKernel = new Function('return ' + kernelString)()({
    context,
    canvas,
    constants: {
      canvas1: canvasInput3,
      canvas2: canvasInput4,
    },
  });
  assert.deepEqual(newKernel()[0], 2);
  gpu.destroy();
}

(GPU.isSinglePrecisionSupported && GPU.isWebGLSupported ? test : skip)(
  'webgl',
  () => {
    testArgument('webgl');
  }
);

(GPU.isSinglePrecisionSupported && GPU.isWebGL2Supported ? test : skip)(
  'webgl2',
  () => {
    testArgument('webgl2');
  }
);
