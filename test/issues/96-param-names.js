const { assert, skip, test, module: describe, only } = require('qunit');
const { GPU } = require('../../src');

describe('issue #96');

function getResult(mode) {
  const A = [
    [1, 1, 1],
    [1, 1, 1]
  ];

  const B = [
    [1, 1],
    [1, 1],
    [1, 1]
  ];

  const gpu = new GPU({ mode });

  function multiply(m, n, y, x) {
    let sum = 0;
    for (let i = 0; i < 2; i++) {
      sum += m[y][i] * n[i][x];
    }
    return sum;
  }

  const kernels = gpu.createKernelMap({
    multiplyResult: multiply
  }, function (a, b) {
    return multiply(b, a, this.thread.y, this.thread.x);
  })
    .setOutput([B.length, A.length]);

  const result = kernels(A, B).result;
  assert.deepEqual(Array.from(result[0]), [2,2,2]);
  assert.deepEqual(Array.from(result[1]), [2,2,2]);
  assert.deepEqual(result.length, 2);
  gpu.destroy();
  return result;
}
(GPU.isKernelMapSupported ? test : skip)("Issue #96 - param names auto", () => {
  getResult();
});
(GPU.isKernelMapSupported ? test : skip)("Issue #96 - param names gpu", () => {
  getResult('gpu');
});
(GPU.isWebGLSupported ? test : skip)("Issue #96 - param names webgl", () => {
  getResult('webgl');
});
(GPU.isWebGL2Supported ? test : skip)("Issue #96 - param names webgl2", () => {
  getResult('webgl2');
});
(GPU.isHeadlessGLSupported && GPU.isKernelMapSupported ? test : skip)("Issue #96 - param names headlessgl", () => {
  getResult('headlessgl');
});
test("Issue #96 - param names cpu", () => {
  getResult('cpu');
});
