const { assert, skip, test, module: describe } = require('qunit');
const { GPU } = require('../../src');

describe('issue #399');

function doubleDefinitionUnsignedPrecision(mode) {
  const gpu = new GPU({ mode });
  const toTexture = gpu.createKernel(function(value) {
    return value[this.thread.x];
  }, {
    precision: 'unsigned',
    output: [2],
    pipeline: true,
    hardcodeConstants: true,
    immutable: true
  });
  // basically it doesn't die, but builds all the way through to webGL
  assert.equal(toTexture([0, 1]).constructor.name, 'GLTextureUnsigned');
  gpu.destroy();
}

(GPU.isWebGLSupported ? test : skip)('Issue #399 - double definition unsigned precision webgl', () => {
  doubleDefinitionUnsignedPrecision('webgl')
});

(GPU.isWebGL2Supported ? test : skip)('Issue #399 - double definition unsigned precision webgl2', () => {
  doubleDefinitionUnsignedPrecision('webgl2')
});

(GPU.isHeadlessGLSupported ? test : skip)('Issue #399 - double definition unsigned precision headlessgl', () => {
  doubleDefinitionUnsignedPrecision('headlessgl')
});

function doubleDefinitionSinglePrecision(mode) {
  const gpu = new GPU({ mode });
  const toTexture = gpu.createKernel(function(value) {
    return value[this.thread.x];
  }, {
    precision: 'single',
    output: [2],
    pipeline: true,
    hardcodeConstants: true,
    immutable: true
  });
  // basically it doesn't die, but builds all the way through to webGL
  assert.equal(toTexture([0, 1]).constructor.name, 'GLTextureFloat');
  gpu.destroy();
}

(GPU.isWebGLSupported && GPU.isSinglePrecisionSupported ? test : skip)('Issue #399 - double definition single precision webgl', () => {
  doubleDefinitionSinglePrecision('webgl')
});

(GPU.isWebGL2Supported && GPU.isSinglePrecisionSupported ? test : skip)('Issue #399 - double definition single precision webgl2', () => {
  doubleDefinitionSinglePrecision('webgl2')
});

(GPU.isHeadlessGLSupported && GPU.isSinglePrecisionSupported ? test : skip)('Issue #399 - double definition single precision headlessgl', () => {
  doubleDefinitionSinglePrecision('headlessgl')
});
