const { assert, skip, test, module: describe } = require('qunit');
const { GPU, HeadlessGLKernel } = require('../../src');

describe('features: read from texture');

function readWithoutTextureKernels(output, gpu) {
  function add(m, n) {
    return m + n;
  }

  return gpu.createKernelMap({
    addResult: add
  }, function (a, b) {
    return add(a[this.thread.x], b[this.thread.x]);
  })
    .setOutput(output);
}

(GPU.isKernelMapSupported ? test : skip)('Read without texture auto', () => {
  const gpu = new GPU();
  const A = [1, 2, 3, 4, 5];
  const B = [1, 2, 3, 4, 5];
  const kernels = readWithoutTextureKernels([A.length], gpu);
  const result = kernels(A, B);
  const nonTextureResult = result.addResult;

  assert.deepEqual(Array.from(result.result), [2, 4, 6, 8, 10]);
  assert.deepEqual(Array.from(nonTextureResult), [2, 4, 6, 8, 10]);
  gpu.destroy();
});

(GPU.isKernelMapSupported ? test : skip)('Read without texture gpu', () => {
  const gpu = new GPU({ mode: 'gpu'});
  const A = [1, 2, 3, 4, 5];
  const B = [1, 2, 3, 4, 5];
  const kernels = readWithoutTextureKernels([A.length], gpu);
  const result = kernels(A, B);
  const nonTextureResult = result.addResult;

  assert.deepEqual(Array.from(result.result), [2, 4, 6, 8, 10]);
  assert.deepEqual(Array.from(nonTextureResult), [2, 4, 6, 8, 10]);
  gpu.destroy();
});

(GPU.isWebGLSupported ? test : skip)('Read without texture webgl', () => {
  const gpu = new GPU({mode: 'webgl'});
  const A = [1, 2, 3, 4, 5];
  const B = [1, 2, 3, 4, 5];
  const kernels = readWithoutTextureKernels([A.length], gpu);
  const result = kernels(A, B);
  const nonTextureResult = result.addResult;

  assert.deepEqual(Array.from(result.result), [2, 4, 6, 8, 10]);
  assert.deepEqual(Array.from(nonTextureResult), [2, 4, 6, 8, 10]);
  gpu.destroy();
});

(GPU.isWebGL2Supported ? test : skip)('Read without texture webgl2', () => {
  const gpu = new GPU({mode: 'webgl2'});
  const A = [1, 2, 3, 4, 5];
  const B = [1, 2, 3, 4, 5];
  const kernels = readWithoutTextureKernels([A.length], gpu);
  const result = kernels(A, B);
  const nonTextureResult = result.addResult;

  assert.deepEqual(Array.from(result.result), [2, 4, 6, 8, 10]);
  assert.deepEqual(Array.from(nonTextureResult), [2, 4, 6, 8, 10]);
  gpu.destroy();
});

(GPU.isHeadlessGLSupported && HeadlessGLKernel.features.kernelMap ? test : skip)('Read without texture headlessgl', () => {
  const gpu = new GPU({mode: 'headlessgl'});
  const A = [1, 2, 3, 4, 5];
  const B = [1, 2, 3, 4, 5];
  const kernels = readWithoutTextureKernels([A.length], gpu);
  const result = kernels(A, B);
  const nonTextureResult = result.addResult;

  assert.deepEqual(Array.from(result.result), [2, 4, 6, 8, 10]);
  assert.deepEqual(Array.from(nonTextureResult), [2, 4, 6, 8, 10]);
  gpu.destroy();
});

function readFromTextureKernels(output, gpu) {
  function add(m, n) {
    return m + n;
  }

  return gpu.createKernelMap({
    addResult: add
  }, function (a, b) {
    return add(a[this.thread.x], b[this.thread.x]);
  })
    .setPipeline(true)
    .setOutput(output);
}

(GPU.isKernelMapSupported ? test : skip)('Read from Texture auto', () => {
  const gpu = new GPU();
  const A = [1, 2, 3, 4, 5];
  const B = [1, 2, 3, 4, 5];
  const kernels = readFromTextureKernels([A.length], gpu);
  const result = kernels(A, B);
  const textureResult = result.addResult;

  assert.deepEqual(Array.from(result.result.toArray()), [2, 4, 6, 8, 10]);
  assert.deepEqual(Array.from(textureResult.toArray()), [2, 4, 6, 8, 10]);
  gpu.destroy();
});

(GPU.isKernelMapSupported ? test : skip)('Read from Texture gpu', () => {
  const gpu = new GPU({ mode: 'gpu'});
  const A = [1, 2, 3, 4, 5];
  const B = [1, 2, 3, 4, 5];
  const kernels = readFromTextureKernels([A.length], gpu);
  const result = kernels(A, B);
  const textureResult = result.addResult;

  assert.deepEqual(Array.from(result.result.toArray()), [2, 4, 6, 8, 10]);
  assert.deepEqual(Array.from(textureResult.toArray()), [2, 4, 6, 8, 10]);
  gpu.destroy();
});

(GPU.isWebGLSupported ? test : skip)('Read from Texture webgl', () => {
  const gpu = new GPU({mode: 'webgl'});
  const A = [1, 2, 3, 4, 5];
  const B = [1, 2, 3, 4, 5];
  const kernels = readFromTextureKernels([A.length], gpu);
  const result = kernels(A, B);
  const textureResult = result.addResult;

  assert.deepEqual(Array.from(result.result.toArray()), [2, 4, 6, 8, 10]);
  assert.deepEqual(Array.from(textureResult.toArray()), [2, 4, 6, 8, 10]);
  gpu.destroy();
});

(GPU.isWebGL2Supported ? test : skip)('Read from Texture webgl2', () => {
  const gpu = new GPU({mode: 'webgl2'});
  const A = [1, 2, 3, 4, 5];
  const B = [1, 2, 3, 4, 5];
  const kernels = readFromTextureKernels([A.length], gpu);
  const result = kernels(A, B);
  const textureResult = result.addResult;

  assert.deepEqual(Array.from(result.result.toArray()), [2, 4, 6, 8, 10]);
  assert.deepEqual(Array.from(textureResult.toArray()), [2, 4, 6, 8, 10]);
  gpu.destroy();
});

(GPU.isHeadlessGLSupported && HeadlessGLKernel.features.kernelMap ? test : skip)('Read from Texture headlessgl', () => {
  const gpu = new GPU({mode: 'headlessgl'});
  const A = [1, 2, 3, 4, 5];
  const B = [1, 2, 3, 4, 5];
  const kernels = readFromTextureKernels([A.length], gpu);
  const result = kernels(A, B);
  const textureResult = result.addResult;

  assert.deepEqual(Array.from(result.result.toArray()), [2, 4, 6, 8, 10]);
  assert.deepEqual(Array.from(textureResult.toArray()), [2, 4, 6, 8, 10]);
  gpu.destroy();
});
