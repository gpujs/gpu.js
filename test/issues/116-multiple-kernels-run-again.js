const { assert, skip, test, module: describe } = require('qunit');
const { GPU } = require('../../src');

describe('issue #116');

function multipleKernels(mode) {
  const gpu = new GPU({ mode });
  const A = [1, 2, 3, 4, 5];
  const B = [1, 2, 3, 4, 5];

  const sizes = [2, 5, 1];

  function add(a, b, x){
    return a[x] + b[x];
  }

  const layerForward = [];

  for (let i = 0;  i < 2; i++) {
    const kernels = gpu.createKernelMap([add],function(a, b){
      return add(a,b, this.thread.x);
    })
      .setOutput([sizes[i + 1]]); // First: 5. Second: 1.

    layerForward.push(kernels);
  }

  const E = layerForward[0](A, B).result;
  const F = layerForward[1](A, B).result;
  const G = layerForward[0](A, B).result;

  assert.deepEqual(Array.from(E), [2, 4, 6, 8, 10]);
  assert.deepEqual(Array.from(F), [2]);
  assert.deepEqual(Array.from(G), [2, 4, 6, 8, 10]);
  gpu.destroy();
}

(GPU.isKernelMapSupported ? test : skip)("Issue #116 - multiple kernels run again auto", () => {
  multipleKernels();
});

(GPU.isKernelMapSupported ? test : skip)("Issue #116 - multiple kernels run again gpu", () => {
  multipleKernels('gpu');
});

(GPU.isWebGLSupported ? test : skip)("Issue #116 - multiple kernels run again webgl", () => {
  multipleKernels('webgl');
});

(GPU.isWebGL2Supported ? test : skip)("Issue #116 - multiple kernels run again webgl2", () => {
  multipleKernels('webgl2');
});

(GPU.isHeadlessGLSupported && GPU.isKernelMapSupported ? test : skip)("Issue #116 - multiple kernels run again headlessgl", () => {
  multipleKernels('headlessgl');
});

test("Issue #116 - multiple kernels run again cpu", () => {
  multipleKernels('cpu');
});
