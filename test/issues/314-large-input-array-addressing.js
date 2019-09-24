const { assert, skip, test, module: describe } = require('qunit');
const { GPU, WebGLKernel, HeadlessGLKernel } = require('../../src');

describe('issue #314');

// max size of ok addressing was 8388608, 8388609 is shifted by 1 so index seems to be 8388610
// after this fix max addressing is 2^31 which is the max a int32 can handle
// run out of heap before being able to create a butter that big!
// wanted to use uints but caused more problems than it solved
WebGLKernel.setupFeatureChecks();
const DATA_MAX = (GPU.isHeadlessGLSupported ? HeadlessGLKernel : WebGLKernel).features.maxTextureSize*8;
const divisor = 100;
const data = new Uint16Array(DATA_MAX);
let v = 0;
for (let i = 0; i < DATA_MAX/divisor; i++) {
  for (let j = 0; j < divisor; j++) {
    data[i*divisor + j] = v++;
  }
}
function buildLargeArrayAddressKernel(mode) {
  const gpu = new GPU({ mode });
  const largeArrayAddressKernel = gpu.createKernel(function(data) {
    return data[this.thread.x];
  }, {
    precision: 'unsigned',
  })
    .setOutput([DATA_MAX]);

  const result = largeArrayAddressKernel(data);

  let same = true;
  let i = 0;
  for (; i < DATA_MAX; i++) {
    if (result[i] !== data[i]) {
      same = false;
      break;
    }
  }
  assert.ok(same, "not all elements are the same, failed on index:" + i);
  gpu.destroy();
}

test('Issue #314 Large array addressing - auto', () => {
  buildLargeArrayAddressKernel(null);
});

test('Issue #314 Large array addressing - gpu', () => {
  buildLargeArrayAddressKernel('gpu');
});

(GPU.isWebGLSupported ? test : skip)('Issue #314 Large array addressing - webgl', () => {
  buildLargeArrayAddressKernel('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('Issue #314 Large array addressing - webgl2', () => {
  buildLargeArrayAddressKernel('webgl2');
});
(GPU.isHeadlessGLSupported ? test : skip)('Issue #314 Large array addressing - headlessgl', () => {
  buildLargeArrayAddressKernel('headlessgl');
});
