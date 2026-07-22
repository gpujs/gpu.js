const { assert, skip, test, module: describe } = require('qunit');
const { GPU } = require('../../src');

describe('internal: dynamic output texture cache');

function testTextureCacheDoesNotGrow(mode) {
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function() {
    return 1;
  }).setDynamicOutput(true);
  kernel.setOutput([8]);
  kernel();
  const cacheSize = kernel.textureCache.length;
  for (let i = 0; i < 32; i++) {
    kernel.setOutput([8 + (i % 4)]);
    kernel();
  }
  // issue #841: every setOutput() leaked the replaced output texture into
  // textureCache, retaining it until the kernel was destroyed
  assert.equal(kernel.textureCache.length, cacheSize);
  gpu.destroy();
}

(GPU.isGPUSupported ? test : skip)('texture cache does not grow on setOutput gpu', () => {
  testTextureCacheDoesNotGrow('gpu');
});

(GPU.isWebGLSupported ? test : skip)('texture cache does not grow on setOutput webgl', () => {
  testTextureCacheDoesNotGrow('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('texture cache does not grow on setOutput webgl2', () => {
  testTextureCacheDoesNotGrow('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('texture cache does not grow on setOutput headlessgl', () => {
  testTextureCacheDoesNotGrow('headlessgl');
});
