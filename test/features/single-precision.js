const { assert, skip, test, module: describe } = require('qunit');
const { GPU } = require('../../src');

describe('features: single precision');
function singlePrecisionKernel(mode) {
  const lst = new Float32Array([1, 2, 3, 4, 5, 6, 7, 8]);
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function(lst) {
    return lst[this.thread.x];
  }, {
    precision: 'single',
    output: [lst.length]
  });
  assert.deepEqual(kernel(lst), lst);
  gpu.destroy();
}

(GPU.isSinglePrecisionSupported ? test : skip)("auto", () => {
  singlePrecisionKernel(null);
});

test("cpu", () => {
  singlePrecisionKernel('cpu');
});

(GPU.isSinglePrecisionSupported ? test : skip)("gpu", () => {
  singlePrecisionKernel('gpu');
});

(GPU.isSinglePrecisionSupported && GPU.isWebGLSupported ? test : skip)("webgl", () => {
  singlePrecisionKernel('webgl');
});

(GPU.isWebGL2Supported ? test : skip)("webgl2", () => {
  singlePrecisionKernel('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)("headlessgl", () => {
  singlePrecisionKernel('headlessgl');
});
