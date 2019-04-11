const { assert, skip, test, only, module: describe } = require('qunit');
const { GPU } = require('../../src');

describe('features: float output textures');

//TODO: handle 2d and 3d
function floatTexturesKernel(output, mode) {
  const original = [1, 2, 3, 4, 5, 6, 7, 8];
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function(packed) {
    return packed[this.thread.x];
  }, {
    output: [original.length],
    floatTextures: true
  });

  const result = kernel(original);
  assert.deepEqual(Array.from(result), original);
  gpu.destroy();
}

(GPU.isKernelMapSupported ? test : skip)('auto', () => {
  floatTexturesKernel();
});

test('cpu', () => {
  floatTexturesKernel('cpu');
});

(GPU.isKernelMapSupported ? test : skip)('gpu', () => {
  floatTexturesKernel('gpu');
});

(GPU.isWebGLSupported && GPU.isKernelMapSupported ? test : skip)('webgl', () => {
  floatTexturesKernel('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('webgl2', () => {
  floatTexturesKernel('webgl2');
});

(GPU.isHeadlessGLSupported && GPU.isKernelMapSupported ? test : skip)('headlessgl', () => {
  floatTexturesKernel('headlessgl');
});
