const { assert, skip, test, module: describe, only } = require('qunit');
const { GPU } = require('../../src');

describe('feature: bitwise operators');

function testBooleanFromExpression(mode) {
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function() {
    const result = 1 === 1 && 2 === 2;
    return result ? 1 : 0;
  }, { output: [1] });
  assert.equal(kernel()[0], 1);
  gpu.destroy();
}

test('auto', () => {
  testBooleanFromExpression();
});

test('gpu', () => {
  testBooleanFromExpression('gpu');
});

(GPU.isWebGLSupported ? test : skip)('webgl', () => {
  testBooleanFromExpression('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('webgl2', () => {
  testBooleanFromExpression('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('headlessgl', () => {
  testBooleanFromExpression('headlessgl');
});

test('cpu', () => {
  testBooleanFromExpression('cpu');
});