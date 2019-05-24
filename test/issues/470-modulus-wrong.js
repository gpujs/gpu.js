const { assert, skip, test, module: describe } = require('qunit');
const { GPU } = require('../../src');

describe('issue #470 - modulus wrong');

function testModulusWrong(mode) {
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function(mod) {
    return this.thread.x % mod;
  }, {
    output: [10],
    argumentTypes: {
      mod: 'Integer',
    },
  });

  const result = kernel(6);
  assert.equal(kernel.argumentTypes[0], 'Integer');
  assert.equal(result[0], 0 % 6);
  assert.equal(result[1], 1 % 6);
  assert.equal(result[2], 2 % 6);
  assert.equal(result[3], 3 % 6);
  assert.equal(result[4], 4 % 6);
  assert.equal(result[5], 5 % 6);
  assert.equal(result[6], 6 % 6);
  assert.equal(result[7], 7 % 6);
  assert.equal(result[8], 8 % 6);
  assert.equal(result[9], 9 % 6);
}

test('auto', () => {
  testModulusWrong();
});

test('gpu', () => {
  testModulusWrong('gpu');
});

(GPU.isWebGLSupported ? test : skip)('webgl', () => {
  testModulusWrong('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('webgl2', () => {
  testModulusWrong('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('headlessgl', () => {
  testModulusWrong('headlessgl');
});

test('cpu', () => {
  testModulusWrong('cpu');
});
