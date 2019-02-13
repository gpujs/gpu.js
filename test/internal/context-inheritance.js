const { assert, skip, test, module: describe, only } = require('qunit');
const { GPU, WebGLKernel, WebGL2Kernel, HeadlessGLKernel } = require('../../src');

describe('internal: context inheritance');

(GPU.isWebGLSupported ? test : skip)('webgl', () => {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('webgl');
  const gpu = new GPU({ context: context });
  const simpleKernel = gpu.createKernel(function() {
      return 1 + 1;
  }, {
      output: [1]
  });
  assert.equal(simpleKernel()[0], 2);
  assert.equal(gpu.Kernel, WebGLKernel);
  assert.equal(simpleKernel.context, context);
  gpu.destroy();
});
(GPU.isWebGL2Supported ? test : skip)('webgl2', () => {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('webgl2');
  const gpu = new GPU({ context: context });
  const simpleKernel = gpu.createKernel(function() {
    return 1 + 1;
  }, {
    output: [1]
  });
  assert.equal(simpleKernel()[0], 2);
  assert.equal(gpu.Kernel, WebGL2Kernel);
  assert.equal(simpleKernel.context, context);
  gpu.destroy();
});
(GPU.isHeadlessGLSupported ? test : skip)('headlessgl', () => {
  const context = require('gl')(1,1);
  const gpu = new GPU({ context: context });
  const simpleKernel = gpu.createKernel(function() {
    return 1 + 1;
  }, {
    output: [1]
  });
  assert.equal(simpleKernel()[0], 2);
  assert.equal(gpu.Kernel, HeadlessGLKernel);
  assert.equal(simpleKernel.context, context);
  gpu.destroy();
});
