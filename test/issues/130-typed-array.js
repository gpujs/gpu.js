const { assert, skip, test, module: describe } = require('qunit');
const { GPU } = require('../../src');

describe('issue #130');
function typedArrays(mode) {
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function(changes) {
    return changes[this.thread.y][this.thread.x];
  })
    .setOutput([2, 1]);

  const values = [new Float32Array(2)];
  values[0][0] = 0;
  values[0][1] = 0;
  const result = kernel(values);
  assert.equal(result[0][0], 0);
  assert.equal(result[0][1], 0);
  gpu.destroy();
}

test("Issue #130 - typed array auto", () => {
  typedArrays(null);
});

test("Issue #130 - typed array gpu", () => {
  typedArrays('gpu');
});

(GPU.isWebGLSupported ? test : skip)("Issue #130 - typed array webgl", () => {
  typedArrays('webgl');
});

(GPU.isWebGL2Supported ? test : skip)("Issue #130 - typed array webgl2", () => {
  typedArrays('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)("Issue #130 - typed array headlessgl", () => {
  typedArrays('headlessgl');
});

test("Issue #130 - typed array cpu", () => {
  typedArrays('cpu');
});
