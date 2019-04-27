const { assert, test, module: describe, only, skip } = require('qunit');
const { GPU } = require('../../src');

describe('features: getPixels');

function getPixels(mode) {
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function(v) {
    this.color(
      v[this.thread.y][this.thread.x][0],
      v[this.thread.y][this.thread.x][1],
      v[this.thread.y][this.thread.x][2]
    );
  }, {
    output: [2,2],
    graphical: true,
  });
  kernel([
    [
      [.02,.04,.06,.08],
      [.10,.12,.14,.16]
    ],
    [
      [.18,.20,.22,.24],
      [.26,.28,.30,.32]
    ]
  ]);
  const pixels = Array.from(kernel.getPixels());
  gpu.destroy();
  return pixels;
}


test('auto', () => {
  const pixels = getPixels();
  assert.deepEqual(pixels, [
    5,
    10,
    15,
    255,
    25,
    31,
    36,
    255,
    46,
    51,
    56,
    255,
    66,
    71,
    76,
    255
  ]);
});

test('gpu', () => {
  const pixels = getPixels('gpu');
  assert.deepEqual(pixels, [
    5,
    10,
    15,
    255,
    25,
    31,
    36,
    255,
    46,
    51,
    56,
    255,
    66,
    71,
    76,
    255
  ]);
});

(GPU.isWebGLSupported ? test : skip)('webgl', () => {
  const pixels = getPixels('webgl');
  assert.deepEqual(pixels, [
    5,
    10,
    15,
    255,
    25,
    31,
    36,
    255,
    46,
    51,
    56,
    255,
    66,
    71,
    76,
    255
  ]);
});

(GPU.isWebGL2Supported ? test : skip)('webgl2', () => {
  const pixels = getPixels('webgl2');
  assert.deepEqual(pixels, [
    5,
    10,
    15,
    255,
    25,
    31,
    36,
    255,
    46,
    51,
    56,
    255,
    66,
    71,
    76,
    255
  ]);
});

(GPU.isHeadlessGLSupported ? test : skip)('headlessgl', () => {
  const pixels = getPixels('headlessgl');
  assert.deepEqual(pixels, [
    5,
    10,
    15,
    255,
    25,
    31,
    36,
    255,
    46,
    51,
    56,
    255,
    66,
    71,
    76,
    255
  ]);
});

(GPU.isCanvasSupported ? test : skip)('cpu', () => {
  const pixels = getPixels('cpu');
  assert.deepEqual(pixels, [
    5,
    10,
    15,
    255,
    25,
    30,
    35,
    255,
    45,
    51,
    56,
    255,
    66,
    71,
    76,
    255
  ]);
});
