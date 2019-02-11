const { assert, skip, test, module: describe } = require('qunit');
const { GPU } = require('../../src');

describe('infinity');
let gpu;
function input(mode) {
  gpu = new GPU({ mode });
  return gpu.createKernel(function() {
    return Infinity;
  })
    .setOutput([1])();
}

test("Infinity auto", () => {
  assert.deepEqual(input()[0], NaN);
  gpu.destroy();
});

test("Infinity cpu", () => {
  assert.deepEqual(input('cpu')[0], Infinity);
  gpu.destroy();
});

test("Infinity gpu", () => {
  assert.deepEqual(input('gpu')[0], NaN);
  gpu.destroy();
});

(GPU.isWebGLSupported ? test : skip)("Infinity webgl", () => {
  assert.deepEqual(input('webgl')[0], NaN);
  gpu.destroy();
});

(GPU.isWebGL2Supported ? test : skip)("Infinity webgl2", () => {
  assert.deepEqual(input('webgl2')[0], NaN);
  gpu.destroy();
});

(GPU.isHeadlessGLSupported ? test : skip)("Infinity headlessgl", () => {
  assert.deepEqual(input('headlessgl')[0], NaN);
  gpu.destroy();
});
