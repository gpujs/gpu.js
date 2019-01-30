const { assert, skip, test, module: describe } = require('qunit');
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

test('auto', () => {
  combineKernels();
});

test('gpu', () => {
  combineKernels('gpu');
});

(GPU.isWebGLSupported ? test : skip)('webgl', () => {
  combineKernels('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('webgl2', () => {
  combineKernels('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('headlessgl', () => {
  combineKernels('headlessgl');
});

test('cpu', () => {
  combineKernels('cpu');
});
