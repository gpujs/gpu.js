const { assert, skip, test, module: describe, only } = require('qunit');
const { GPU } = require('../../src');

describe('issue #567 - wrong modulus');

function testWrongModulus(mode) {
  const gpu = new GPU({ mode });
  const kernel1 = gpu.createKernel(function () {
    return 91 % 7;
  }, {
    output: [1]
  });
  assert.equal(kernel1()[0], 91 % 7);

  const kernel2 = gpu.createKernel(function (value1, value2) {
    return value1 % value2;
  }, {
    output: [1],
  });
  assert.equal(kernel2(91, 7)[0], 91 % 7);

  const kernel3 = gpu.createKernel(function (value1, value2) {
    return value1 % value2;
  }, {
    output: [1],
  });
  assert.equal(kernel3(91, 7)[0], 91 % 7);

  const kernel4 = gpu.createKernel(function () {
    return this.constants.value1 % this.constants.value2;
  }, {
    output: [1],
    constants: {
      value1: 91,
      value2: 7,
    }
  });
  assert.equal(kernel4()[0].toFixed(2), 91 % 7);

  const kernel5 = gpu.createKernel(function () {
    return 91 % this.constants.value;
  }, {
    output: [1],
    constants: {
      value: 7
    },
    strictIntegers: true
  });
  assert.equal(kernel5()[0], 91 % 7);

  gpu.destroy();
}

test('auto', () => {
  testWrongModulus();
});

test('gpu', () => {
  testWrongModulus('gpu');
});

(GPU.isWebGLSupported ? test : skip)('webgl', () => {
  testWrongModulus('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('webgl2', () => {
  testWrongModulus('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('headlessgl', () => {
  testWrongModulus('headlessgl');
});

test('cpu', () => {
  testWrongModulus('cpu');
});