const { assert, skip, test, module: describe } = require('qunit');
const { GPU } = require('../../src');

describe('issue #471 - canvas issue');

function testCanvasIssue(mode) {
  const gpu = new GPU({mode});
  const render = gpu
    .createKernel(function () {
      this.color(0, 0, 0, 1);
    })
    .setOutput([200, 200])
    .setGraphical(true);

  render();

  assert.equal(render.canvas.constructor.name, 'HTMLCanvasElement');
  gpu.destroy();
}

(GPU.isCanvasSupported ? test : skip)('auto', () => {
  testCanvasIssue();
});

(GPU.isCanvasSupported ? test : skip)('gpu', () => {
  testCanvasIssue('gpu');
});

(GPU.isWebGLSupported ? test : skip)('webgl', () => {
  testCanvasIssue('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('webgl2', () => {
  testCanvasIssue('webgl2');
});

(GPU.isCanvasSupported ? test : skip)('cpu', () => {
  testCanvasIssue('cpu');
});
