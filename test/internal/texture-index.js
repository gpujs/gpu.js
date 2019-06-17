const { assert, skip, test, module: describe, only } = require('qunit');
const { GPU } = require('../../src');

describe('internal: texture index');
function createKernelWithNumberConstants(mode) {
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function() {
    return this.constants.v1 + this.constants.v2;
  }, { output: [1], constants: { v1: 1, v2: 1 } });

  kernel();
  assert.equal(kernel.kernelConstants.length, 2);
  assert.equal(kernel.kernelConstants[0].contextHandle, null);
  assert.equal(kernel.kernelConstants[1].contextHandle, null);

  assert.equal(kernel.kernelArguments.length, 0);

  gpu.destroy();
}

test('createKernel with number constants auto', () => {
  createKernelWithNumberConstants();
});
(GPU.isWebGL2Supported ? test : skip)('createKernel with number constants gpu', () => {
  createKernelWithNumberConstants('gpu');
});
(GPU.isWebGL2Supported ? test : skip)('createKernel with number constants webgl', () => {
  createKernelWithNumberConstants('webgl');
});
(GPU.isWebGL2Supported ? test : skip)('createKernel with number constants webgl2', () => {
  createKernelWithNumberConstants('webgl2');
});
(GPU.isHeadlessGLSupported ? test : skip)('createKernel with number constants headlessgl', () => {
  createKernelWithNumberConstants('headlessgl');
});


function createKernelWithArrayConstants(mode) {
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function() {
    return this.constants.v1[this.thread.x] + this.constants.v2[this.thread.x];
  }, { output: [1], constants: { v1: [1], v2: [1] } });

  kernel();
  const gl = kernel.context;
  assert.equal(kernel.kernelConstants.length, 2);
  assert.equal(kernel.kernelConstants[0].contextHandle, gl.TEXTURE0);
  assert.equal(kernel.kernelConstants[1].contextHandle, gl.TEXTURE0 + 1);

  assert.equal(kernel.kernelArguments.length, 0);

  gpu.destroy();
}
test('createKernel with array constants auto', () => {
  createKernelWithArrayConstants();
});
(GPU.isGPUSupported ? test : skip)('createKernel with array constants gpu', () => {
  createKernelWithArrayConstants('gpu');
});
(GPU.isWebGLSupported ? test : skip)('createKernel with array constants webgl', () => {
  createKernelWithArrayConstants('webgl');
});
(GPU.isWebGL2Supported ? test : skip)('createKernel with array constants webgl2', () => {
  createKernelWithArrayConstants('webgl2');
});
(GPU.isHeadlessGLSupported ? test : skip)('createKernel with array constants headlessgl', () => {
  createKernelWithArrayConstants('headlessgl');
});

function creatKernelWithNumberConstantsAndArrayArguments(mode) {
  const gpu = new GPU({ mode });
  const textureGetter = gpu.createKernel(function() {
    return 1;
  }, { output: [1], pipeline: true });
  const texture1 = textureGetter();
  const texture2 = textureGetter();
  const kernel = gpu.createKernel(function(value1, value2) {
    return value1[this.thread.x] + value2[this.thread.x] + this.constants.v1 + this.constants.v2;
  }, { output: [1], constants: { v1: 1, v2: 1 } });

  const output = kernel(texture1, texture2);

  const gl = kernel.context;
  assert.equal(kernel.kernelConstants.length, 2);
  assert.equal(kernel.kernelConstants[0].contextHandle, null);
  assert.equal(kernel.kernelConstants[1].contextHandle, null);

  assert.equal(kernel.kernelArguments.length, 2);
  assert.equal(kernel.kernelArguments[0].contextHandle, gl.TEXTURE0);
  assert.equal(kernel.kernelArguments[1].contextHandle, gl.TEXTURE0 + 1);

  gpu.destroy();
}
test('createKernel with number constants & array arguments auto', () => {
  creatKernelWithNumberConstantsAndArrayArguments();
});
(GPU.isGPUSupported ? test : skip)('createKernel with number constants & array arguments gpu', () => {
  creatKernelWithNumberConstantsAndArrayArguments('gpu');
});
(GPU.isWebGLSupported ? test : skip)('createKernel with number constants & array arguments webgl', () => {
  creatKernelWithNumberConstantsAndArrayArguments('webgl');
});
(GPU.isWebGL2Supported ? test : skip)('createKernel with number constants & array arguments webgl2', () => {
  creatKernelWithNumberConstantsAndArrayArguments('webgl2');
});
(GPU.isHeadlessGLSupported ? test : skip)('createKernel with number constants & array arguments headlessgl', () => {
  creatKernelWithNumberConstantsAndArrayArguments('headlessgl');
});

function createKernelMapWithArrayConstantsAndTextureArguments(mode) {
  const gpu = new GPU({ mode });
  function calcValue1(v) {
    return v;
  }
  function calcValue2(v) {
    return v;
  }
  const textureGetter = gpu.createKernel(function() {
    return 1;
  }, { output: [1], pipeline: true });
  const texture1 = textureGetter();
  const texture2 = textureGetter();
  const kernel = gpu.createKernelMap({
    mappedValue1: calcValue1,
    mappedValue2: calcValue2,
  }, function(value1, value2) {
    return calcValue1(value1[this.thread.x] + value2[this.thread.x]) + calcValue2(this.constants.v1[this.thread.x] + this.constants.v2[this.thread.x]);
  }, { output: [1], constants: { v1: [1], v2: [1] } });

  kernel(texture1, texture2);
  const gl = kernel.context;
  assert.equal(kernel.kernelConstants.length, 2);
  assert.equal(kernel.kernelConstants[0].contextHandle, gl.TEXTURE0);
  assert.equal(kernel.kernelConstants[1].contextHandle, gl.TEXTURE0 + 1);

  assert.equal(kernel.kernelArguments.length, 2);
  assert.equal(kernel.kernelArguments[0].contextHandle, gl.TEXTURE0 + 2);
  assert.equal(kernel.kernelArguments[1].contextHandle, gl.TEXTURE0 + 3);

  gpu.destroy();
}
test('createKernelMap with array constants & texture arguments auto', () => {
  createKernelMapWithArrayConstantsAndTextureArguments();
});
(GPU.isGPUSupported ? test : skip)('createKernelMap with array constants & texture arguments gpu', () => {
  createKernelMapWithArrayConstantsAndTextureArguments('gpu');
});
(GPU.isWebGLSupported ? test : skip)('createKernelMap with array constants & texture arguments webgl', () => {
  createKernelMapWithArrayConstantsAndTextureArguments('webgl');
});
(GPU.isWebGL2Supported ? test : skip)('createKernelMap with array constants & texture arguments webgl2', () => {
  createKernelMapWithArrayConstantsAndTextureArguments('webgl2');
});
(GPU.isHeadlessGLSupported ? test : skip)('createKernelMap with array constants & texture arguments headlessgl', () => {
  createKernelMapWithArrayConstantsAndTextureArguments('headlessgl');
});
