const { assert, skip, test, module: describe } = require('qunit');
const { GPU } = require('../../src');

describe('issue #279');

const WIDTH = 600;
const HEIGHT =   400;
function wrongCanvasSizeOptimized(mode) {
  const gpu = new GPU({ mode });

  const initMatrix = gpu.createKernel(function(value) {
    return value;
  })
    .setOptimizeFloatMemory(true)
    .setOutput([WIDTH, HEIGHT]);

  const render = gpu.createKernel(function(matrix) {
    const i = matrix[this.thread.y][this.thread.x];
    this.color(i, i, i, 1);
  })
    .setOutput([WIDTH, HEIGHT])
    .setGraphical(true);

  const matrix = initMatrix(0.5);
  render(matrix);
  const canvas = render.canvas;
  assert.equal(canvas.width, WIDTH);
  assert.equal(canvas.height, HEIGHT);
  gpu.destroy();
}

(GPU.isCanvasSupported ? test : skip)('Issue #279 wrong canvas size optimized - cpu', () => {
  wrongCanvasSizeOptimized('cpu');
});

test('Issue #279 wrong canvas size optimized - gpu', () => {
  wrongCanvasSizeOptimized('gpu');
});

(GPU.isWebGLSupported ? test : skip)('Issue #279 wrong canvas size optimized - webgl', () => {
  wrongCanvasSizeOptimized('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('Issue #279 wrong canvas size optimized - webgl2', () => {
  wrongCanvasSizeOptimized('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('Issue #279 wrong canvas size optimized - headlessgl', () => {
  wrongCanvasSizeOptimized('headlessgl');
});


function wrongCanvasSizeUnoptimized(mode) {
  const gpu = new GPU({ mode });

  const initMatrix = gpu.createKernel(function(value) {
    return value;
  })
    .setOptimizeFloatMemory(false)
    .setOutput([WIDTH, HEIGHT]);

  const render = gpu.createKernel(function(matrix) {
    const i = matrix[this.thread.y][this.thread.x];
    this.color(i, i, i, 1);
  })
    .setOutput([WIDTH, HEIGHT])
    .setGraphical(true);

  const matrix = initMatrix(0.5);
  render(matrix);
  const canvas = render.canvas;
  assert.equal(canvas.width, WIDTH);
  assert.equal(canvas.height, HEIGHT);
  gpu.destroy();
}

(GPU.isCanvasSupported ? test : skip)('Issue #279 wrong canvas size unoptimized - cpu', () => {
  wrongCanvasSizeUnoptimized('cpu');
});

test('Issue #279 wrong canvas size unoptimized - gpu', () => {
  wrongCanvasSizeUnoptimized('gpu');
});

(GPU.isWebGLSupported ? test : skip)('Issue #279 wrong canvas size unoptimized - webgl', () => {
  wrongCanvasSizeUnoptimized('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('Issue #279 wrong canvas size unoptimized - webgl2', () => {
  wrongCanvasSizeUnoptimized('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('Issue #279 wrong canvas size unoptimized - headlessgl', () => {
  wrongCanvasSizeUnoptimized('headlessgl');
});
