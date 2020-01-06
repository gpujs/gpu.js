const { assert, skip, test, module: describe, only } = require('qunit');
const { GPU } = require('../../src');

describe('issue #553 - permanent flip');

function testFixPermanentFlip(precision, mode) {
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function(a1, a2, a3, a4) {
    return a2[this.thread.x];
  }, {
    precision,
    output: [4]
  });
  const arr = [1, 2, 3, 4];
  for (let i = 0; i < 4; i++) {
    assert.deepEqual(kernel(
      999,
      arr,
      new Image(2, 2),
      999,
    ), new Float32Array(arr));
  }

  gpu.destroy();
}

// unsigned
(typeof Image === 'undefined' ? skip : test)('auto unsigned', () => {
  testFixPermanentFlip('unsigned');
});

(typeof Image === 'undefined' ? skip : test)('gpu unsigned', () => {
  testFixPermanentFlip('unsigned', 'gpu');
});

(GPU.isWebGLSupported ? test : skip)('webgl unsigned', () => {
  testFixPermanentFlip('unsigned', 'webgl');
});

(GPU.isWebGL2Supported ? test : skip)('webgl2 unsigned', () => {
  testFixPermanentFlip('unsigned', 'webgl2');
});

(typeof Image === 'undefined' ? skip : test)('cpu unsigned', () => {
  testFixPermanentFlip('unsigned', 'cpu');
});

// single
(typeof Image === 'undefined' ? skip : test)('auto single', () => {
  testFixPermanentFlip('single');
});

(typeof Image === 'undefined' ? skip : test)('gpu single', () => {
  testFixPermanentFlip('single', 'gpu');
});

(GPU.isWebGLSupported ? test : skip)('webgl single', () => {
  testFixPermanentFlip('single', 'webgl');
});

(GPU.isWebGL2Supported ? test : skip)('webgl2 single', () => {
  testFixPermanentFlip('single', 'webgl2');
});

(typeof Image === 'undefined' ? skip : test)('cpu single', () => {
  testFixPermanentFlip('single', 'cpu');
});