const { assert, skip, test, module: describe } = require('qunit');
const { GPU, HeadlessGLKernel, WebGLKernel, WebGL2Kernel, CPUKernel } = require('../../src');

describe('issue #91');
function getResult(mode) {
  const A = [
    [1, 2],
    [3, 4],
    [5, 6]
  ];

  const B = [
    [6, 5, 4],
    [3, 2, 1]
  ];

  const gpu = new GPU({ mode });

  function multiply(b, a, y, x) {
    let sum = 0;
    for (let i = 0; i < 2; i++) {
      sum += b[y][i] * a[i][x];
    }
    return sum;
  }

  const kernels = gpu.createKernelMap({
    multiplyResult: multiply
  }, function (a, b) {
    return multiply(b, a, this.thread.y, this.thread.x);
  })
    .setOutput([2, 2]);
  const result = kernels(A, B).result;
  assert.deepEqual(Array.from(result[0]), [21,32]);
  assert.deepEqual(Array.from(result[1]), [9,14]);
  gpu.destroy();
  return kernels;
}
(GPU.isWebGL2Supported || (GPU.isHeadlessGLSupported && HeadlessGLKernel.features.kernelMap) ? test : skip)("Issue #91 - type detection auto", () => {
  getResult();
});
(GPU.isWebGL2Supported || (GPU.isHeadlessGLSupported && HeadlessGLKernel.features.kernelMap) ? test : skip)("Issue #91 - type detection gpu", () => {
  getResult('gpu');
});
(GPU.isWebGLSupported ? test : skip)("Issue #91 - type detection webgl", () => {
  const kernel = getResult('webgl');
  assert.equal(kernel.kernel.constructor, WebGLKernel, 'kernel type is wrong');
});
(GPU.isWebGL2Supported ? test : skip)("Issue #91 - type detection webgl2", () => {
  const kernel = getResult('webgl2');
  assert.equal(kernel.kernel.constructor, WebGL2Kernel, 'kernel type is wrong');
});
(GPU.isHeadlessGLSupported ? test : skip)("Issue #91 - type detection headlessgl", () => {
  const kernel = getResult('headlessgl');
  assert.equal(kernel.kernel.constructor, HeadlessGLKernel, 'kernel type is wrong');
});
test("Issue #91 - type detection cpu", () => {
  const kernel = getResult('cpu');
  assert.equal(kernel.kernel.constructor, CPUKernel, 'kernel type is wrong');
});
