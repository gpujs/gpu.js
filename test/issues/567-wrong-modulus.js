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
  assert.equal(kernel1()[0].toFixed(2), '0.00');

  const kernel2 = gpu.createKernel(function (value) {
    return 91 % value;
  }, {
    output: [1]
  });
  assert.equal(kernel2(7)[0].toFixed(2), '0.00');

  const kernel3 = gpu.createKernel(function () {
    return 91 % this.constants.value;
  }, {
    output: [1],
    constants: {
      value: 7
    }
  });
  assert.equal(kernel3()[0].toFixed(2), '0.00');


  const kernel4 = gpu.createKernel(function () {
    return 91 % this.constants.value;
  }, {
    output: [1],
    constants: {
      value: 7
    },
    strictIntegers: true
  });
  assert.equal(kernel4()[0].toFixed(2), '0.00');

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