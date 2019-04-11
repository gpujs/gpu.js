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


function combineKernelsFloatOutput(mode) {
  const gpu = new GPU({ mode });

  const kernel1 = gpu.createKernel(function(a, b) {
    return a[this.thread.x] + b[this.thread.x];
  }, { output: [5], floatOutput: true });

  const kernel2 = gpu.createKernel(function(c, d) {
    return c[this.thread.x] * d[this.thread.x];
  }, { output: [5], floatOutput: true });

  const superKernel = gpu.combineKernels(kernel1, kernel2, function(array1, array2, array3) {
    return kernel2(kernel1(array1, array2), array3);
  });

  const result = superKernel([1,2,3,4,5], [1,2,3,4,5], [1,2,3,4,5]);
  assert.deepEqual(Array.from(result), [2, 8, 18, 32, 50]);
  gpu.destroy()
}

(GPU.isFloatOutputSupported ? test : skip)('combine kernel float output auto', () => {
  combineKernelsFloatOutput();
});

(GPU.isFloatOutputSupported ? test : skip)('combine kernel float output gpu', () => {
  combineKernelsFloatOutput('gpu');
});

(GPU.isWebGLSupported && GPU.isFloatOutputSupported ? test : skip)('combine kernel float output webgl', () => {
  combineKernelsFloatOutput('webgl');
});

(GPU.isWebGL2Supported && GPU.isFloatOutputSupported ? test : skip)('combine kernel float output webgl2', () => {
  combineKernelsFloatOutput('webgl2');
});

(GPU.isHeadlessGLSupported && GPU.isFloatOutputSupported ? test : skip)('combine kernel float output headlessgl', () => {
  combineKernelsFloatOutput('headlessgl');
});

test('combine kernel float output cpu', () => {
  combineKernelsFloatOutput('cpu');
});


function combineKernelsFloatTextures(mode) {
  const gpu = new GPU({ mode });

  const kernel1 = gpu.createKernel(function(a, b) {
    return a[this.thread.x] + b[this.thread.x];
  }, { output: [5], floatTextures: true });

  const kernel2 = gpu.createKernel(function(c, d) {
    return c[this.thread.x] * d[this.thread.x];
  }, { output: [5], floatTextures: true });

  console.log(kernel1([1,2,3,4,5], [1,2,3,4,5]));
  const superKernel = gpu.combineKernels(kernel1, kernel2, function(array1, array2, array3) {
    return kernel2(kernel1(array1, array2), array3);
  });

  const result = superKernel([1,2,3,4,5], [1,2,3,4,5], [1,2,3,4,5]);
  assert.deepEqual(Array.from(result), [2, 8, 18, 32, 50]);
  gpu.destroy()
}

(GPU.isFloatOutputSupported ? test : skip)('combine kernel float textures auto', () => {
  combineKernelsFloatTextures();
});

(GPU.isFloatOutputSupported ? test : skip)('combine kernel float textures gpu', () => {
  combineKernelsFloatTextures('gpu');
});

(GPU.isWebGLSupported && GPU.isFloatOutputSupported ? test : skip)('combine kernel float textures webgl', () => {
  combineKernelsFloatTextures('webgl');
});

(GPU.isWebGL2Supported && GPU.isFloatOutputSupported ? test : skip)('combine kernel float textures webgl2', () => {
  combineKernelsFloatTextures('webgl2');
});

(GPU.isHeadlessGLSupported && GPU.isFloatOutputSupported ? test : skip)('combine kernel float textures headlessgl', () => {
  combineKernelsFloatTextures('headlessgl');
});

test('combine kernel float textures cpu', () => {
  combineKernelsFloatTextures('cpu');
});
