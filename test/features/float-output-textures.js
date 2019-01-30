const { assert, skip, test, module: describe } = require('qunit');
const { GPU } = require('../../src');

describe('float output textures');

function floatTexturesKernel(output, mode) {
  const lst = new Float32Array([1, 2, 3, 4, 5, 6, 7, 8]);
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function(lst) {
    return lst[this.thread.x];
  })
    .setFloatTextures(true)
    .setOutput([lst.length]);

  const result = kernel(lst);
  assert.deepEqual(result, lst);
  gpu.destroy();
}

(GPU.isKernelMapSupported ? test : skip)("floatTextures auto", () => {
  floatTexturesKernel();
});

test("cpu", () => {
  assert.throws(() => {
    floatTexturesKernel('cpu');
  });
});

(GPU.isKernelMapSupported ? test : skip)("gpu", () => {
  floatTexturesKernel('gpu');
});

(GPU.isWebGLSupported && GPU.isKernelMapSupported ? test : skip)("webgl", () => {
  floatTexturesKernel('webgl');
});

(GPU.isWebGL2Supported ? test : skip)("webgl2", () => {
  floatTexturesKernel('webgl2');
});

(GPU.isHeadlessGLSupported && GPU.isKernelMapSupported ? test : skip)("headlessgl", () => {
  floatTexturesKernel('headlessgl');
});
