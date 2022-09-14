const { assert, skip, test, module: describe } = require('qunit');
const { GPU } = require('../../src');

describe('features: read from image data');

function readImageData(mode) {
  const gpu = new GPU({ mode });
  const dataArray = new Uint8ClampedArray([255, 255, 255, 255]);
  const imageData = new ImageData(dataArray, 1, 1);
  const kernel = gpu.createKernel(function(imageData) {
    const pixel = imageData[this.thread.y][this.thread.x];
    return pixel[0] + pixel[1] + pixel[2] + pixel[3];
  }, {
    output: [1]
  });
  const result = kernel(imageData);
  assert.equal(result.length, 1);
  assert.equal(result[0], 4);
  gpu.destroy();
}

(typeof ImageData !== 'undefined' ? test : skip)('readImageData auto', () => {
  readImageData(null);
});

(typeof ImageData !== 'undefined' ? test : skip)('readImageData gpu', () => {
  readImageData('gpu');
});

(GPU.isWebGLSupported && typeof ImageData !== 'undefined' ? test : skip)('readImageData webgl', () => {
  readImageData('webgl');
});

(GPU.isWebGL2Supported && typeof ImageData !== 'undefined' ? test : skip)('readImageData webgl2', () => {
  readImageData('webgl2');
});

(GPU.isHeadlessGLSupported && typeof ImageData !== 'undefined' ? test : skip)('readImageData headlessgl', () => {
  readImageData('headlessgl');
});

(typeof ImageData !== 'undefined' ? test : skip)('readImageData cpu', () => {
  readImageData('cpu');
});
