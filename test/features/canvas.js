const { assert, skip, test, module: describe } = require('qunit');
const { GPU } = require('../../src');
const { greenCanvas } = require('../browser-test-utils');

describe('features: canvas argument');
function canvasArgumentTest(mode) {
  const gpu = new GPU({ mode });
  const canvas = greenCanvas(mode, 1, 1);
  const kernel = gpu.createKernel(function(canvas) {
    const pixel = canvas[this.thread.y][this.thread.x];
    return pixel[1];
  }, {
    output : [canvas.width, canvas.height]
  });
  const result = kernel(canvas);
  assert.equal(result[0][0], 1);
  gpu.destroy();
}

(typeof HTMLCanvasElement !== 'undefined' ? test : skip)('auto', () => {
  canvasArgumentTest();
});

(typeof HTMLCanvasElement !== 'undefined' ? test : skip)('gpu', () => {
  canvasArgumentTest('gpu');
});

(GPU.isWebGLSupported && typeof HTMLCanvasElement !== 'undefined' ? test : skip)('webgl', () => {
  canvasArgumentTest('webgl');
});

(GPU.isWebGL2Supported && typeof HTMLCanvasElement !== 'undefined' ? test : skip)('webgl2', () => {
  canvasArgumentTest('webgl2');
});

(typeof HTMLCanvasElement !== 'undefined' ? test : skip)('cpu', () => {
  canvasArgumentTest('cpu');
});

function canvasManuallyDefinedArgumentTest(mode) {
  const gpu = new GPU({ mode });
  const canvas = greenCanvas(mode, 1, 1);
  const kernel = gpu.createKernel(function(canvas) {
    const pixel = canvas[this.thread.y][this.thread.x];
    return pixel[1];
  }, {
    output : [canvas.width, canvas.height],
    argumentTypes: { canvas: 'HTMLCanvas' }
  });
  const result = kernel(canvas);
  assert.equal(result[0][0], 1);
  gpu.destroy();
}

(typeof HTMLCanvasElement !== 'undefined' ? test : skip)('manually defined auto', () => {
  canvasManuallyDefinedArgumentTest();
});

(typeof HTMLCanvasElement !== 'undefined' ? test : skip)('manually defined gpu', () => {
  canvasManuallyDefinedArgumentTest('gpu');
});

(GPU.isWebGLSupported && typeof HTMLCanvasElement !== 'undefined' ? test : skip)('manually defined webgl', () => {
  canvasManuallyDefinedArgumentTest('webgl');
});

(GPU.isWebGL2Supported && typeof HTMLCanvasElement !== 'undefined' ? test : skip)('manually defined webgl2', () => {
  canvasManuallyDefinedArgumentTest('webgl2');
});

(typeof HTMLCanvasElement !== 'undefined' ? test : skip)('manually defined cpu', () => {
  canvasManuallyDefinedArgumentTest('cpu');
});