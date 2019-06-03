const { assert, test, module: describe, only, skip } = require('qunit');
const { GPU } = require('../../src');

describe('internal: constructor features');

function channelCount(mode) {
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function() {
    return 1;
  }, { output: [1] });
  kernel();
  assert.ok(kernel.kernel.constructor.features.channelCount >= 1);
  gpu.destroy();
}

(GPU.isGPUSupported ? test : skip)('channelCount auto', () => {
  channelCount();
});

(GPU.isGPUSupported ? test : skip)('channelCount gpu', () => {
  channelCount('gpu');
});

(GPU.isWebGLSupported ? test : skip)('channelCount webgl', () => {
  channelCount('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('channelCount webgl2', () => {
  channelCount('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('channelCount headlessgl', () => {
  channelCount('headlessgl');
});
