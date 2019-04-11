const { assert, test, module: describe, only, skip } = require('qunit');
const { GPU } = require('../../src');

describe('internal: deep types');

function oneLayerDeepFloat(mode) {
  const gpu = new GPU({ mode });
  function childFunction(childFunctionArgument1) {
    return childFunctionArgument1 + 1;
  }
  gpu.addFunction(childFunction);
  const kernel = gpu.createKernel(function(kernelArgument1) {
    return childFunction(kernelArgument1);
  }, { output: [1] });
  const result = kernel(1.5);
  assert.equal(result[0], 2.5);
}

(GPU.isWebGLSupported ? test : skip)('one layer deep float WebGL', () => {
  oneLayerDeepFloat('webgl');
});
(GPU.isWebGL2Supported ? test : skip)('one layer deep float WebGL2', () => {
  oneLayerDeepFloat('webgl2');
});
(GPU.isHeadlessGLSupported ? test : skip)('one layer deep float HeadlessGL', () => {
  oneLayerDeepFloat('headlessgl');
});

function twoLayerDeepFloat(mode) {
  const gpu = new GPU({ mode });
  function child1Function(child1FunctionArgument1) {
    return child2Function(child1FunctionArgument1);
  }
  function child2Function(child2FunctionArgument1) {
    return child2FunctionArgument1 + 1;
  }
  gpu
    .addFunction(child1Function)
    .addFunction(child2Function);
  const kernel = gpu.createKernel(function(kernelArgument1) {
    return child1Function(kernelArgument1);
  }, { output: [1] });
  const result = kernel(1.5);
  assert.equal(result[0], 2.5);
}

(GPU.isWebGLSupported ? test : skip)('two layer deep float WebGL', () => {
  twoLayerDeepFloat('webgl');
});
(GPU.isWebGL2Supported ? test : skip)('two layer deep float WebGL2', () => {
  twoLayerDeepFloat('webgl2');
});
(GPU.isHeadlessGLSupported ? test : skip)('two layer deep float HeadlessGL', () => {
  twoLayerDeepFloat('headlessgl');
});


function threeLayerDeepFloat(mode) {
  const gpu = new GPU({ mode });
  function child1Function(child1FunctionArgument1) {
    return child2Function(child1FunctionArgument1);
  }
  function child2Function(child2FunctionArgument1) {
    return child3Function(child2FunctionArgument1 + 1);
  }
  function child3Function(child3FunctionArgument1) {
    return child3FunctionArgument1 + 1;
  }
  gpu
    .addFunction(child1Function)
    .addFunction(child2Function)
    .addFunction(child3Function);
  const kernel = gpu.createKernel(function(kernelArgument1) {
    return child1Function(kernelArgument1);
  }, { output: [1] });
  const result = kernel(1.5);
  assert.equal(result[0], 3.5);
}

(GPU.isWebGLSupported ? test : skip)('three layer deep float WebGL', () => {
  threeLayerDeepFloat('webgl');
});
(GPU.isWebGL2Supported ? test : skip)('three layer deep float WebGL2', () => {
  threeLayerDeepFloat('webgl2');
});
(GPU.isHeadlessGLSupported ? test : skip)('three layer deep float HeadlessGL', () => {
  threeLayerDeepFloat('headlessgl');
});
