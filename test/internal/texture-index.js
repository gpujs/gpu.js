const { assert, skip, test, module: describe, only } = require('qunit');
const { GPU } = require('../../src');

describe('internal: texture index');

test('createKernel with number constants headlessgl', () => {
  const gpu = new GPU({ mode: 'headlessgl' });
  const kernel = gpu.createKernel(function() {
    return this.constants.v1 + this.constants.v2;
  }, { output: [1], constants: { v1: 1, v2: 1 } });

  kernel();
  assert.equal(kernel.kernelConstants.length, 2);
  assert.equal(kernel.kernelConstants[0].contextHandle, null);
  assert.equal(kernel.kernelConstants[1].contextHandle, null);

  assert.equal(kernel.kernelArguments.length, 0);

  gpu.destroy();
});

test('createKernel with array constants headlessgl', () => {
  const gpu = new GPU({ mode: 'headlessgl' });
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
});

test('createKernel with number constants & array arguments headlessgl', () => {
  const gpu = new GPU({ mode: 'headlessgl' });
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
});

test('createKernelMap with array constants & texture arguments headlessgl', () => {
  const gpu = new GPU({ mode: 'headlessgl' });
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
    return value1[this.thread.x] + value2[this.thread.x] + this.constants.v1[this.thread.x] + this.constants.v2[this.thread.x];
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
});
