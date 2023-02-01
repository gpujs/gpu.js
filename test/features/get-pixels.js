const { assert, test, module: describe, only, skip } = require('qunit');
const { GPU } = require('../..');

describe('features: getPixels');

function getPixelsStandard(mode) {
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(
    function (v) {
      this.color(
        v[this.thread.y][this.thread.x][0],
        v[this.thread.y][this.thread.x][1],
        v[this.thread.y][this.thread.x][2]
      );
    },
    {
      output: [2, 2],
      graphical: true,
    }
  );
  kernel([
    [
      [0.02, 0.04, 0.06, 0.08],
      [0.1, 0.12, 0.14, 0.16],
    ],
    [
      [0.18, 0.2, 0.22, 0.24],
      [0.26, 0.28, 0.3, 0.32],
    ],
  ]);
  const pixels = Array.from(kernel.getPixels());
  gpu.destroy();
  return pixels;
}

test('standard auto', () => {
  const pixels = getPixelsStandard();
  assert.deepEqual(
    pixels,
    [46, 51, 56, 255, 66, 71, 76, 255, 5, 10, 15, 255, 25, 31, 36, 255]
  );
});

test('standard gpu', () => {
  const pixels = getPixelsStandard('gpu');
  assert.deepEqual(
    pixels,
    [46, 51, 56, 255, 66, 71, 76, 255, 5, 10, 15, 255, 25, 31, 36, 255]
  );
});

(GPU.isWebGLSupported ? test : skip)('standard webgl', () => {
  const pixels = getPixelsStandard('webgl');
  assert.deepEqual(
    pixels,
    [46, 51, 56, 255, 66, 71, 76, 255, 5, 10, 15, 255, 25, 31, 36, 255]
  );
});

(GPU.isWebGL2Supported ? test : skip)('standard webgl2', () => {
  const pixels = getPixelsStandard('webgl2');
  assert.deepEqual(
    pixels,
    [46, 51, 56, 255, 66, 71, 76, 255, 5, 10, 15, 255, 25, 31, 36, 255]
  );
});

(GPU.isHeadlessGLSupported ? test : skip)('standard headlessgl', () => {
  const pixels = getPixelsStandard('headlessgl');
  assert.deepEqual(
    pixels,
    [46, 51, 56, 255, 66, 71, 76, 255, 5, 10, 15, 255, 25, 31, 36, 255]
  );
});

(GPU.isCanvasSupported ? test : skip)('standard cpu', () => {
  const pixels = getPixelsStandard('cpu');
  assert.deepEqual(
    pixels,
    [45, 51, 56, 255, 66, 71, 76, 255, 5, 10, 15, 255, 25, 30, 35, 255]
  );
});

function getPixelsFlipped(mode) {
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(
    function (v) {
      this.color(
        v[this.thread.y][this.thread.x][0],
        v[this.thread.y][this.thread.x][1],
        v[this.thread.y][this.thread.x][2]
      );
    },
    {
      output: [2, 2],
      graphical: true,
    }
  );
  kernel([
    [
      [0.02, 0.04, 0.06, 0.08],
      [0.1, 0.12, 0.14, 0.16],
    ],
    [
      [0.18, 0.2, 0.22, 0.24],
      [0.26, 0.28, 0.3, 0.32],
    ],
  ]);
  const pixels = Array.from(kernel.getPixels(true));
  gpu.destroy();
  return pixels;
}

test('flipped auto', () => {
  const pixels = getPixelsFlipped();
  assert.deepEqual(
    pixels,
    [5, 10, 15, 255, 25, 31, 36, 255, 46, 51, 56, 255, 66, 71, 76, 255]
  );
});

test('flipped gpu', () => {
  const pixels = getPixelsFlipped('gpu');
  assert.deepEqual(
    pixels,
    [5, 10, 15, 255, 25, 31, 36, 255, 46, 51, 56, 255, 66, 71, 76, 255]
  );
});

(GPU.isWebGLSupported ? test : skip)('flipped webgl', () => {
  const pixels = getPixelsFlipped('webgl');
  assert.deepEqual(
    pixels,
    [5, 10, 15, 255, 25, 31, 36, 255, 46, 51, 56, 255, 66, 71, 76, 255]
  );
});

(GPU.isWebGL2Supported ? test : skip)('flipped webgl2', () => {
  const pixels = getPixelsFlipped('webgl2');
  assert.deepEqual(
    pixels,
    [5, 10, 15, 255, 25, 31, 36, 255, 46, 51, 56, 255, 66, 71, 76, 255]
  );
});

(GPU.isHeadlessGLSupported ? test : skip)('flipped headlessgl', () => {
  const pixels = getPixelsFlipped('headlessgl');
  assert.deepEqual(
    pixels,
    [5, 10, 15, 255, 25, 31, 36, 255, 46, 51, 56, 255, 66, 71, 76, 255]
  );
});

(GPU.isCanvasSupported ? test : skip)('flipped cpu', () => {
  const pixels = getPixelsFlipped('cpu');
  assert.deepEqual(
    pixels,
    [5, 10, 15, 255, 25, 30, 35, 255, 45, 51, 56, 255, 66, 71, 76, 255]
  );
});
