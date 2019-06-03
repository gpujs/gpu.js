const sinon = require('sinon');
const { assert, test, module: describe, only, skip } = require('qunit');
const { GPU, FunctionBuilder } = require('../../src');

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
  sinon.spy(FunctionBuilder.prototype, 'lookupArgumentType');
  sinon.spy(FunctionBuilder.prototype, 'lookupReturnType');
  const result = kernel(1.5);
  assert.equal(result[0], 2.5);

  assert.equal(FunctionBuilder.prototype.lookupArgumentType.callCount, 1);
  assert.equal(FunctionBuilder.prototype.lookupArgumentType.args[0][0], 'childFunctionArgument1');

  assert.equal(FunctionBuilder.prototype.lookupReturnType.callCount, 1);
  assert.equal(FunctionBuilder.prototype.lookupReturnType.args[0][0], 'childFunction');

  FunctionBuilder.prototype.lookupArgumentType.restore();
  FunctionBuilder.prototype.lookupReturnType.restore();
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
  sinon.spy(FunctionBuilder.prototype, 'lookupArgumentType');
  sinon.spy(FunctionBuilder.prototype, 'lookupReturnType');
  const result = kernel(1.5);
  assert.equal(result[0], 2.5);
  assert.equal(FunctionBuilder.prototype.lookupArgumentType.callCount, 2);
  assert.equal(FunctionBuilder.prototype.lookupArgumentType.args[0][0], 'child2FunctionArgument1');
  assert.equal(FunctionBuilder.prototype.lookupArgumentType.args[1][0], 'child1FunctionArgument1');

  assert.equal(FunctionBuilder.prototype.lookupReturnType.callCount, 3);
  assert.equal(FunctionBuilder.prototype.lookupReturnType.args[0][0], 'child1Function');
  assert.equal(FunctionBuilder.prototype.lookupReturnType.args[1][0], 'child2Function');
  assert.equal(FunctionBuilder.prototype.lookupReturnType.args[2][0], 'child2Function');

  FunctionBuilder.prototype.lookupArgumentType.restore();
  FunctionBuilder.prototype.lookupReturnType.restore();
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

function twoArgumentLayerDeepFloat(mode) {
  const gpu = new GPU({ mode });
  function child1Function(child1FunctionArgument1) {
    return child1FunctionArgument1 + 1;
  }
  function child2Function(child2FunctionArgument1) {
    return child2FunctionArgument1 + 1;
  }
  gpu
    .addFunction(child1Function)
    .addFunction(child2Function);
  const kernel = gpu.createKernel(function(kernelArgument1) {
    return child1Function(child2Function(kernelArgument1));
  }, { output: [1] });
  sinon.spy(FunctionBuilder.prototype, 'lookupArgumentType');
  sinon.spy(FunctionBuilder.prototype, 'lookupReturnType');
  const result = kernel(1.5);
  assert.equal(kernel.returnType, 'Float');
  assert.equal(result[0], 3.5);
  assert.equal(FunctionBuilder.prototype.lookupArgumentType.callCount, 2);
  assert.equal(FunctionBuilder.prototype.lookupArgumentType.args[0][0], 'child1FunctionArgument1');
  assert.equal(FunctionBuilder.prototype.lookupArgumentType.args[1][0], 'child2FunctionArgument1');

  assert.equal(FunctionBuilder.prototype.lookupReturnType.callCount, 4);
  assert.equal(FunctionBuilder.prototype.lookupReturnType.args[0][0], 'child1Function');
  assert.equal(FunctionBuilder.prototype.lookupReturnType.args[1][0], 'child2Function');
  assert.equal(FunctionBuilder.prototype.lookupReturnType.args[2][0], 'child2Function');
  assert.equal(FunctionBuilder.prototype.lookupReturnType.args[3][0], 'child2Function');

  FunctionBuilder.prototype.lookupArgumentType.restore();
  FunctionBuilder.prototype.lookupReturnType.restore();
}

(GPU.isWebGLSupported ? test : skip)('two argument layer deep float WebGL', () => {
  twoArgumentLayerDeepFloat('webgl');
});
(GPU.isWebGL2Supported ? test : skip)('two argument layer deep float WebGL2', () => {
  twoArgumentLayerDeepFloat('webgl2');
});
(GPU.isHeadlessGLSupported ? test : skip)('two argument layer deep float HeadlessGL', () => {
  twoArgumentLayerDeepFloat('headlessgl');
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
  sinon.spy(FunctionBuilder.prototype, 'lookupArgumentType');
  sinon.spy(FunctionBuilder.prototype, 'lookupReturnType');
  const result = kernel(1.5);
  assert.equal(result[0], 3.5);
  assert.equal(FunctionBuilder.prototype.lookupArgumentType.callCount, 3);
  assert.equal(FunctionBuilder.prototype.lookupArgumentType.args[0][0], 'child3FunctionArgument1');
  assert.equal(FunctionBuilder.prototype.lookupArgumentType.args[1][0], 'child2FunctionArgument1');
  assert.equal(FunctionBuilder.prototype.lookupArgumentType.args[2][0], 'child1FunctionArgument1');

  assert.equal(FunctionBuilder.prototype.lookupReturnType.callCount, 5);
  assert.equal(FunctionBuilder.prototype.lookupReturnType.args[0][0], 'child1Function');
  assert.equal(FunctionBuilder.prototype.lookupReturnType.args[1][0], 'child2Function');
  assert.equal(FunctionBuilder.prototype.lookupReturnType.args[2][0], 'child3Function');
  assert.equal(FunctionBuilder.prototype.lookupReturnType.args[3][0], 'child2Function');
  assert.equal(FunctionBuilder.prototype.lookupReturnType.args[4][0], 'child3Function');

  FunctionBuilder.prototype.lookupArgumentType.restore();
  FunctionBuilder.prototype.lookupReturnType.restore();
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

function threeArgumentLayerDeepFloat(mode) {
  const gpu = new GPU({ mode });
  function child1Function(child1FunctionArgument1) {
    return child1FunctionArgument1 + 1;
  }
  function child2Function(child2FunctionArgument1) {
    return child2FunctionArgument1 + 1;
  }
  function child3Function(child3FunctionArgument1) {
    return child3FunctionArgument1 + 1;
  }
  gpu
    .addFunction(child1Function)
    .addFunction(child2Function)
    .addFunction(child3Function);
  const kernel = gpu.createKernel(function(kernelArgument1) {
    return child1Function(child2Function(child3Function(kernelArgument1)));
  }, { output: [1] });
  sinon.spy(FunctionBuilder.prototype, 'lookupArgumentType');
  sinon.spy(FunctionBuilder.prototype, 'lookupReturnType');
  const result = kernel(1.5);
  assert.equal(result[0], 4.5);
  assert.equal(FunctionBuilder.prototype.lookupArgumentType.callCount, 3);
  assert.equal(FunctionBuilder.prototype.lookupArgumentType.args[0][0], 'child1FunctionArgument1');
  assert.equal(FunctionBuilder.prototype.lookupArgumentType.args[1][0], 'child2FunctionArgument1');
  assert.equal(FunctionBuilder.prototype.lookupArgumentType.args[2][0], 'child3FunctionArgument1');

  assert.equal(FunctionBuilder.prototype.lookupReturnType.callCount, 8);
  assert.equal(FunctionBuilder.prototype.lookupReturnType.args[0][0], 'child1Function');
  assert.equal(FunctionBuilder.prototype.lookupReturnType.args[1][0], 'child2Function');
  assert.equal(FunctionBuilder.prototype.lookupReturnType.args[2][0], 'child2Function');
  assert.equal(FunctionBuilder.prototype.lookupReturnType.args[3][0], 'child3Function');
  assert.equal(FunctionBuilder.prototype.lookupReturnType.args[4][0], 'child2Function');
  assert.equal(FunctionBuilder.prototype.lookupReturnType.args[5][0], 'child3Function');
  assert.equal(FunctionBuilder.prototype.lookupReturnType.args[6][0], 'child2Function');
  assert.equal(FunctionBuilder.prototype.lookupReturnType.args[7][0], 'child3Function');

  FunctionBuilder.prototype.lookupArgumentType.restore();
  FunctionBuilder.prototype.lookupReturnType.restore();
}

(GPU.isWebGLSupported ? test : skip)('three argument layer deep float WebGL', () => {
  threeArgumentLayerDeepFloat('webgl');
});
(GPU.isWebGL2Supported ? test : skip)('three argument layer deep float WebGL2', () => {
  threeArgumentLayerDeepFloat('webgl2');
});
(GPU.isHeadlessGLSupported ? test : skip)('three argument layer deep float HeadlessGL', () => {
  threeArgumentLayerDeepFloat('headlessgl');
});

function circlicalLogic(mode) {
  const gpu = new GPU({ mode });
  function child1Function(child1FunctionArgument1) {
    return child1Function(child1FunctionArgument1);
  }
  gpu
    .addFunction(child1Function);
  const kernel = gpu.createKernel(function(kernelArgument1) {
    return child1Function(kernelArgument1);
  }, { output: [1] });
  assert.throws(() => {
    kernel(1.5);
  });
}

(GPU.isWebGLSupported ? test : skip)('circlical logic webgl', () => {
  circlicalLogic('webgl');
});
(GPU.isWebGL2Supported ? test : skip)('circlical logic webgl', () => {
  circlicalLogic('webgl2');
});
(GPU.isHeadlessGLSupported ? test : skip)('circlical logic webgl', () => {
  circlicalLogic('headlessgl');
});
