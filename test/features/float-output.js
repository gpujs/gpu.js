const { assert, skip, test, module: describe } = require('qunit');
const { GPU } = require('../../src');

describe('features: float output');
function floatOutputKernel(mode) {
  const lst = new Float32Array([1, 2, 3, 4, 5, 6, 7, 8]);
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function(lst) {
    return lst[this.thread.x];
  }, { floatOutput: true, output: [lst.length] });
  assert.deepEqual(kernel(lst), lst);
  gpu.destroy();
}

test("auto", () => {
  floatOutputKernel(null);
});

test("cpu", () => {
  floatOutputKernel('cpu');
});

test("gpu", () => {
  floatOutputKernel('gpu');
});

(GPU.isWebGLSupported ? test : skip)("webgl", () => {
  floatOutputKernel('webgl');
});

(GPU.isWebGL2Supported ? test : skip)("webgl2", () => {
  floatOutputKernel('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)("headlessgl", () => {
  floatOutputKernel('headlessgl');
});
