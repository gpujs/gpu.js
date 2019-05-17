const { assert, skip, test, module: describe, only } = require('qunit');
const { GPU } = require('../../src');

describe('issue #357');

// complimentary tests in features/arithmetic-operators.js & features/assignment-operators.js
function testModKernel(mode) {
  const gpu = new GPU({mode});
  const nValues = 100;

  const myFunc3 = gpu.createKernel(function(x) {
    return x[this.thread.x % 3];
  }).setOutput([nValues]);

  const input = [1, 2, 3];
  myFunc3(input);

  const expected = new Float32Array(nValues);
  for (let i = 0; i < nValues; i++) {
    expected[i] = input[i % 3];
  }
  assert.deepEqual(myFunc3([1, 2, 3]), expected);
  gpu.destroy();
}

(GPU.isWebGLSupported ? test : skip)('Issue #357 - modulus issue webgl', () => {
  testModKernel('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('Issue #357 - modulus issue webgl2', () => {
  testModKernel('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('Issue #357 - modulus issue headlessgl', () => {
  testModKernel('headlessgl');
});

