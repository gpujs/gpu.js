const { assert, skip, test, module: describe } = require('qunit');

describe('issue #399');

const { GPU, Texture } = require('../../src');
function doubleDefinition(mode) {
  const gpu = new GPU({ mode });
  const toTexture = gpu.createKernel(function(value) {
    return value[this.thread.x];
  }, {
    output: [2],
    pipeline: true,
    hardcodeConstants: true,
    immutable: true
  });
  // basically it doesn't die, but builds all the way through to webGL
  assert.equal(toTexture([0, 1]).constructor, Texture);
  gpu.destroy();
}

(GPU.isWebGLSupported ? test : skip)('Issue #399 - double definition webgl', () => {
  doubleDefinition('webgl')
});

(GPU.isWebGL2Supported ? test : skip)('Issue #399 - double definition webgl2', () => {
  doubleDefinition('webgl2')
});

(GPU.isHeadlessGLSupported ? test : skip)('Issue #399 - double definition headlessgl', () => {
  doubleDefinition('headlessgl')
});
