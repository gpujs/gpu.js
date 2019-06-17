const { assert, skip, test, module: describe } = require('qunit');
const { GPU } = require('../../src');

describe('issue # 114');
function secondKernelMap(mode) {
  const gpu = new GPU({ mode });
  const A = [1, 2, 3, 4, 5];
  const B = [1, 2, 3, 4, 5];
  function add(a,b){
    return a + b;
  }
  const kernels = gpu.createKernelMap([add], function(a, b) {
    return add(a[this.thread.x], b[this.thread.x]);
  })
    .setOutput([5]);

  const E = kernels(A, B).result;
  const F = kernels(A, B).result;
  const G = kernels(A, B).result;

  assert.deepEqual(Array.from(E), [2, 4, 6, 8, 10]);
  assert.deepEqual(Array.from(F), [2, 4, 6, 8, 10]);
  assert.deepEqual(Array.from(G), [2, 4, 6, 8, 10]);
  gpu.destroy();
}
(GPU.isKernelMapSupported ? test : skip)("Issue #114 - run createKernelMap the second time auto", () => {
  secondKernelMap();
});
(GPU.isKernelMapSupported ? test : skip)("Issue #114 - run createKernelMap the second time gpu", () => {
  secondKernelMap('gpu');
});
(GPU.isWebGLSupported ? test : skip)("Issue #114 - run createKernelMap the second time webgl", () => {
  secondKernelMap('webgl');
});
(GPU.isWebGL2Supported ? test : skip)("Issue #114 - run createKernelMap the second time webgl2", () => {
  secondKernelMap('webgl2');
});
(GPU.isHeadlessGLSupported && GPU.isKernelMapSupported ? test : skip)("Issue #114 - run createKernelMap the second time headlessgl", () => {
  secondKernelMap('headlessgl');
});
