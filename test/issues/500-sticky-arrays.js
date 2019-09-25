const { assert, skip, test, module: describe, only } = require('qunit');
const { GPU } = require('../../src');

describe('issue #500 - strange literal');

function testStickyArrays(mode) {
  const gpu = new GPU({ mode });
  function processImage(image) {
    return image[0];
  }
  gpu.addFunction(processImage);
  const kernel = gpu.createKernel(function(image1, image2, image3) {
    return [processImage(image1), processImage(image2), processImage(image3)];
  }, { output: [1] });

  assert.deepEqual(kernel([1], [2], [3]), [new Float32Array([1,2,3])]);
}

test('auto', () => {
  testStickyArrays();
});

test('gpu', () => {
  testStickyArrays('gpu');
});

(GPU.isWebGLSupported ? test : skip)('webgl', () => {
  testStickyArrays('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('webgl2', () => {
  testStickyArrays('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('headlessgl', () => {
  testStickyArrays('headlessgl');
});

test('cpu', () => {
  testStickyArrays('cpu');
});
