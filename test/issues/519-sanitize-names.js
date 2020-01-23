const { assert, skip, test, module: describe, only } = require('qunit');
const { GPU } = require('../../src');

describe('issue #519 - sanitize names');

function testSanitizeNames(mode) {
  const gpu = new GPU({ mode });
  const kernel1 = gpu.createKernel(function (value__$, value__, value$, _) {
    return value__$ + value__ + value$ + _ + 1;
  }, {
    output: [1]
  });
  assert.equal(kernel1(1, 2, 3, 4)[0], 11);
  gpu.destroy();
}

test('auto', () => {
  testSanitizeNames();
});

test('gpu', () => {
  testSanitizeNames('gpu');
});

(GPU.isWebGLSupported ? test : skip)('webgl', () => {
  testSanitizeNames('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('webgl2', () => {
  testSanitizeNames('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('headlessgl', () => {
  testSanitizeNames('headlessgl');
});

test('cpu', () => {
  testSanitizeNames('cpu');
});