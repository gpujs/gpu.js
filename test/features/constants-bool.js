const { assert, skip, test, module: describe } = require('qunit');
const { GPU } = require('../../src');

describe('features: constants bool');

function boolTrueConstantTest(mode) {
  const gpu = new GPU({ mode });
  const bool = true;
  const tryConst = gpu.createKernel(
    function() {
      return this.constants.bool ? 1 : 0;
    },
    {
      constants: { bool },
      output: [1]
    },
  );
  const result = tryConst();
  assert.equal(result[0], 1, 'bool constant passed test');
  gpu.destroy();
}

test('true auto', () => {
  boolTrueConstantTest(null);
});

test('true gpu', () => {
  boolTrueConstantTest('gpu');
});

(GPU.isWebGLSupported ? test : skip)('true webgl', () => {
  boolTrueConstantTest('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('true webgl2', () => {
  boolTrueConstantTest('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('true headlessgl', () => {
  boolTrueConstantTest('headlessgl');
});

test('true cpu', () => {
  boolTrueConstantTest('cpu');
});


function boolFalseConstantTest(mode) {
  const gpu = new GPU({ mode });
  const bool = false;
  const tryConst = gpu.createKernel(
    function() {
      return this.constants.bool ? 1 : 0;
    },
    {
      constants: { bool },
      output: [1]
    },
  );
  const result = tryConst();
  assert.equal(result[0], 0, 'bool constant passed test');
  gpu.destroy();
}

test('false auto', () => {
  boolFalseConstantTest(null);
});

test('false gpu', () => {
  boolFalseConstantTest('gpu');
});

(GPU.isWebGLSupported ? test : skip)('false webgl', () => {
  boolFalseConstantTest('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('false webgl2', () => {
  boolFalseConstantTest('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('false headlessgl', () => {
  boolFalseConstantTest('headlessgl');
});

test('false cpu', () => {
  boolFalseConstantTest('cpu');
});
