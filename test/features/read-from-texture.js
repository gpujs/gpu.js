const { assert, skip, test, module: describe } = require('qunit');
const { GPU, HeadlessGLKernel } = require('../../src');

describe('features: read from texture');

function readWithoutTextureKernels(mode) {
  const gpu = new GPU({ mode });

  function add(m, n) {
    return m + n;
  }

  const kernels = gpu.createKernelMap({
    addResult: add
  }, function (a, b) {
    return add(a[this.thread.x], b[this.thread.x]);
  })
    .setOutput([5]);
  const result = kernels([1, 2, 3, 4, 5], [1, 2, 3, 4, 5]);
  const nonTextureResult = result.addResult;
  assert.deepEqual(Array.from(result.result), [2, 4, 6, 8, 10]);
  assert.deepEqual(Array.from(nonTextureResult), [2, 4, 6, 8, 10]);
  gpu.destroy();
}

(GPU.isKernelMapSupported ? test : skip)('Read without texture auto', () => {
  readWithoutTextureKernels();
});

(GPU.isKernelMapSupported ? test : skip)('Read without texture gpu', () => {
  readWithoutTextureKernels('gpu');
});

(GPU.isWebGLSupported ? test : skip)('Read without texture webgl', () => {
  readWithoutTextureKernels('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('Read without texture webgl2', () => {
  readWithoutTextureKernels('webgl2');
});

(GPU.isHeadlessGLSupported && HeadlessGLKernel.features.kernelMap ? test : skip)('Read without texture headlessgl', () => {
  readWithoutTextureKernels('headlessgl');
});

function readFromTextureKernels(mode) {
  const gpu = new GPU({ mode });
  function add(m, n) {
    return m + n;
  }
  const kernels = gpu.createKernelMap({
    addResult: add
  }, function (a, b) {
    return add(a[this.thread.x], b[this.thread.x]);
  })
    .setPipeline(true)
    .setOutput([5]);
  const result = kernels([1, 2, 3, 4, 5], [1, 2, 3, 4, 5]);
  const textureResult = result.addResult;
  assert.deepEqual(Array.from(result.result.toArray()), [2, 4, 6, 8, 10]);
  assert.deepEqual(Array.from(textureResult.toArray()), [2, 4, 6, 8, 10]);
  gpu.destroy();
}

(GPU.isKernelMapSupported ? test : skip)('Read from Texture auto', () => {
  readFromTextureKernels();
});

(GPU.isKernelMapSupported ? test : skip)('Read from Texture gpu', () => {
  readFromTextureKernels('gpu');
});

(GPU.isWebGLSupported ? test : skip)('Read from Texture webgl', () => {
  readFromTextureKernels('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('Read from Texture webgl2', () => {
  readFromTextureKernels('webgl2');
});

(GPU.isHeadlessGLSupported && HeadlessGLKernel.features.kernelMap ? test : skip)('Read from Texture headlessgl', () => {
  readFromTextureKernels('headlessgl');
});
