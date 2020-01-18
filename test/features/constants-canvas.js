const { assert, skip, test, module: describe } = require('qunit');
const { GPU } = require('../../src');
const { greenCanvas } = require('../browser-test-utils');

describe('features: constants canvas');
function canvasConstantTest(mode) {
  const gpu = new GPU({ mode });
  const canvas = greenCanvas(mode, 1, 1);
  const kernel = gpu.createKernel(
    function() {
      const pixel = this.constants.canvas[this.thread.y][this.thread.x];
      return pixel.g;
    },
    {
      constants: { canvas },
      output: [1, 1],
    }
  );
  const result = kernel();
  const test = result[0][0] > 0;
  assert.ok(test, 'image constant passed test');
  gpu.destroy();
}

(typeof HTMLCanvasElement !== 'undefined' ? test : skip)('auto', () => {
  canvasConstantTest(null);
});

(typeof HTMLCanvasElement !== 'undefined' ? test : skip)('gpu', () => {
  canvasConstantTest('gpu');
});

(GPU.isWebGLSupported && typeof HTMLCanvasElement !== 'undefined' ? test : skip)('webgl', () => {
  canvasConstantTest('webgl');
});

(GPU.isWebGL2Supported && typeof HTMLCanvasElement !== 'undefined' ? test : skip)('webgl2', () => {
  canvasConstantTest('webgl2');
});

(typeof HTMLCanvasElement !== 'undefined' ? test : skip)('cpu', () => {
  canvasConstantTest('cpu');
});
