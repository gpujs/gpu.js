const { assert, test, skip, module: describe, only } = require('qunit');
const { GPU } = require('../../src');

describe('internal: GPU methods');

test('.createKernelMap() object map with settings', () => {
  const gpu = new GPU();
  let source = null;
  let settings = null;
  function bob() {}
  function tom() {}
  class MockKernel {
    constructor(_source, _settings) {
      source = _source;
      settings = _settings;
      this.context = 'context';
      this.canvas = 'canvas';
      this.subKernels = _settings.subKernels;
    }
  }
  gpu.Kernel = MockKernel;
  const subKernels = {
    bobResult: bob,
    tomResult: tom
  };
  const kernelSource = function() {};
  const masterSettings = {};
  const kernel = gpu.createKernelMap(subKernels, kernelSource, masterSettings);
  assert.equal(source, kernelSource.toString());
  assert.notEqual(settings, masterSettings);
  assert.equal(gpu.canvas, 'canvas');
  assert.equal(gpu.context, 'context');
  assert.equal(settings.functions, gpu.functions);
  assert.equal(settings.nativeFunctions, gpu.nativeFunctions);
  assert.equal(settings.gpu, gpu);
  assert.equal(settings.validate, true);
  assert.deepEqual(kernel.subKernels, [
    {
      name: 'bob',
      source: bob.toString(),
      property: 'bobResult'
    },
    {
      name: 'tom',
      source: tom.toString(),
      property: 'tomResult'
    }
  ]);
});

test('.createKernelMap() array map with settings', () => {
  const gpu = new GPU();
  let source = null;
  let settings = null;
  function bob() {}
  function tom() {}
  class MockKernel {
    constructor(_source, _settings) {
      source = _source;
      settings = _settings;
      this.context = 'context';
      this.canvas = 'canvas';
      this.subKernels = _settings.subKernels;
    }
  }
  gpu.Kernel = MockKernel;
  const subKernels = [bob, tom];
  const kernelSource = function() {};
  const masterSettings = {};
  const kernel = gpu.createKernelMap(subKernels, kernelSource, masterSettings);
  assert.equal(source, kernelSource.toString());
  assert.notEqual(settings, masterSettings);
  assert.equal(gpu.canvas, 'canvas');
  assert.equal(gpu.context, 'context');
  assert.equal(settings.functions, gpu.functions);
  assert.equal(settings.nativeFunctions, gpu.nativeFunctions);
  assert.equal(settings.gpu, gpu);
  assert.equal(settings.validate, true);
  assert.deepEqual(kernel.subKernels, [
    {
      name: 'bob',
      source: bob.toString(),
      property: 0
    },
    {
      name: 'tom',
      source: tom.toString(),
      property: 1
    }
  ]);
});
