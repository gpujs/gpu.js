const { assert, skip, test, module: describe, only } = require('qunit');
const { GPU } = require('../../src');

describe('features: combine kernels');
function combineKernels(mode) {
  const gpu = new GPU({ mode });

  const kernel1 = gpu.createKernel(function(a, b) {
    return a[this.thread.x] + b[this.thread.x];
  }, { output: [5] });

  const kernel2 = gpu.createKernel(function(c, d) {
    return c[this.thread.x] * d[this.thread.x];
  }, { output: [5] });

  const superKernel = gpu.combineKernels(kernel1, kernel2, function(array1, array2, array3) {
    return kernel2(kernel1(array1, array2), array3);
  });

  const result = superKernel([1,2,3,4,5], [1,2,3,4,5], [1,2,3,4,5]);
  assert.deepEqual(Array.from(result), [2, 8, 18, 32, 50]);
  gpu.destroy()
}

test('combine kernel auto', () => {
  combineKernels();
});

test('combine kernel gpu', () => {
  combineKernels('gpu');
});

(GPU.isWebGLSupported ? test : skip)('combine kernel webgl', () => {
  combineKernels('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('combine kernel webgl2', () => {
  combineKernels('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('combine kernel headlessgl', () => {
  combineKernels('headlessgl');
});

test('combine kernel cpu', () => {
  combineKernels('cpu');
});


function combineKernelsSinglePrecision(mode) {
  const gpu = new GPU({ mode });

  const kernel1 = gpu.createKernel(function(a, b) {
    return a[this.thread.x] + b[this.thread.x];
  }, { output: [5], precision: 'single' });

  const kernel2 = gpu.createKernel(function(c, d) {
    return c[this.thread.x] * d[this.thread.x];
  }, { output: [5], precision: 'single' });

  const superKernel = gpu.combineKernels(kernel1, kernel2, function(array1, array2, array3) {
    return kernel2(kernel1(array1, array2), array3);
  });

  const result = superKernel([1,2,3,4,5], [1,2,3,4,5], [1,2,3,4,5]);
  assert.deepEqual(Array.from(result), [2, 8, 18, 32, 50]);
  gpu.destroy()
}

(GPU.isSinglePrecisionSupported ? test : skip)('combine kernel single precision auto', () => {
  combineKernelsSinglePrecision();
});

(GPU.isSinglePrecisionSupported ? test : skip)('combine kernel single precision gpu', () => {
  combineKernelsSinglePrecision('gpu');
});

(GPU.isWebGLSupported && GPU.isSinglePrecisionSupported ? test : skip)('combine kernel single precision webgl', () => {
  combineKernelsSinglePrecision('webgl');
});

(GPU.isWebGL2Supported && GPU.isSinglePrecisionSupported ? test : skip)('combine kernel single precision webgl2', () => {
  combineKernelsSinglePrecision('webgl2');
});

(GPU.isHeadlessGLSupported && GPU.isSinglePrecisionSupported ? test : skip)('combine kernel single precision headlessgl', () => {
  combineKernelsSinglePrecision('headlessgl');
});

test('combine kernel single precision cpu', () => {
  combineKernelsSinglePrecision('cpu');
});


function combineKernelsOptimizeFloatMemory(mode) {
  const gpu = new GPU({ mode });

  const kernel1 = gpu.createKernel(function(a, b) {
    return a[this.thread.x] + b[this.thread.x];
  }, {
    output: [5],
    precision: 'single',
    optimizeFloatMemory: true,
  });

  const kernel2 = gpu.createKernel(function(c, d) {
    return c[this.thread.x] * d[this.thread.x];
  }, {
    output: [5],
    precision: 'single',
    optimizeFloatMemory: true,
  });

  const superKernel = gpu.combineKernels(kernel1, kernel2, function(array1, array2, array3) {
    return kernel2(kernel1(array1, array2), array3);
  });

  const result = superKernel([1,2,3,4,5], [1,2,3,4,5], [1,2,3,4,5]);
  assert.deepEqual(Array.from(result), [2, 8, 18, 32, 50]);
  gpu.destroy()
}

(GPU.isSinglePrecisionSupported ? test : skip)('combine kernel float textures auto', () => {
  combineKernelsOptimizeFloatMemory();
});

(GPU.isSinglePrecisionSupported ? test : skip)('combine kernel float textures gpu', () => {
  combineKernelsOptimizeFloatMemory('gpu');
});

(GPU.isWebGLSupported && GPU.isSinglePrecisionSupported ? test : skip)('combine kernel float textures webgl', () => {
  combineKernelsOptimizeFloatMemory('webgl');
});

(GPU.isWebGL2Supported && GPU.isSinglePrecisionSupported ? test : skip)('combine kernel float textures webgl2', () => {
  combineKernelsOptimizeFloatMemory('webgl2');
});

(GPU.isHeadlessGLSupported && GPU.isSinglePrecisionSupported ? test : skip)('combine kernel float textures headlessgl', () => {
  combineKernelsOptimizeFloatMemory('headlessgl');
});

test('combine kernel float textures cpu', () => {
  combineKernelsOptimizeFloatMemory('cpu');
});
