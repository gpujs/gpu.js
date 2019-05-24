const { assert, skip, test, module: describe, only } = require('qunit');
const { GPU } = require('../../src');

describe('issue #472 - compilation issue');

function testCompilationIssue(mode) {
  const gpu = new GPU({ mode });
  const kernelFunction = function(data, wobble) {
    let x = this.thread.x,
      y = this.thread.y;

    x = Math.floor(x + wobble * Math.sin(y / 10));
    y = Math.floor(y + wobble * Math.cos(x / 10));

    const n = 4 * (x + this.constants.w * (this.constants.h - y));
    this.color(data[n] / 256, data[n + 1] / 256, data[n + 2] / 256, 1);
  };
  const render = gpu.createKernel(kernelFunction, {
    constants: { w: 4, h: 4 },
    output: [2, 2],
    graphical: true,
  });
  render(new Uint8ClampedArray([
    230,233,240,255,
    231,234,241,255,
    232,235,242,255,
    233,236,243,255
  ]), 14 * Math.sin(Date.now() / 400));
  assert.equal(render.getPixels().length, 2 * 2 * 4);
  gpu.destroy();
}

test('auto', () => {
  testCompilationIssue();
});

test('gpu', () => {
  testCompilationIssue('gpu');
});

(GPU.isWebGLSupported ? test : skip)('webgl', () => {
  testCompilationIssue('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('webgl2', () => {
  testCompilationIssue('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('headlessgl', () => {
  testCompilationIssue('headlessgl');
});

(GPU.isCanvasSupported ? test : skip)('cpu', () => {
  testCompilationIssue('cpu');
});
