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
  sinon.spy(FunctionBuilder.prototype, 'lookupReturnType');
  try {
    const result = kernel(1.5);
    assert.equal(result[0], 2.5);
    assert.equal(FunctionBuilder.prototype.lookupReturnType.callCount, 1);
    assert.equal(FunctionBuilder.prototype.lookupReturnType.args[0][0], 'childFunction');
  } finally {
    FunctionBuilder.prototype.lookupReturnType.restore();
  }
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
  sinon.spy(FunctionBuilder.prototype, 'lookupReturnType');
  try {
    const result = kernel(1.5);
    assert.equal(result[0], 2.5);
    assert.equal(FunctionBuilder.prototype.lookupReturnType.callCount, 3);
    assert.equal(FunctionBuilder.prototype.lookupReturnType.args[0][0], 'child1Function');
    assert.equal(FunctionBuilder.prototype.lookupReturnType.args[1][0], 'child2Function');
    assert.equal(FunctionBuilder.prototype.lookupReturnType.args[2][0], 'child2Function');
  } finally {
    FunctionBuilder.prototype.lookupReturnType.restore();
  }
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
  sinon.spy(FunctionBuilder.prototype, 'lookupReturnType');
  try {
    const result = kernel(1.5);
    assert.equal(kernel.returnType, 'Float');
    assert.equal(result[0], 3.5);
    assert.equal(FunctionBuilder.prototype.lookupReturnType.callCount, 3);
    assert.equal(FunctionBuilder.prototype.lookupReturnType.args[0][0], 'child2Function');
    assert.equal(FunctionBuilder.prototype.lookupReturnType.args[1][0], 'child1Function');
    assert.equal(FunctionBuilder.prototype.lookupReturnType.args[2][0], 'child2Function');
  } finally {
    FunctionBuilder.prototype.lookupReturnType.restore();
  }
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
  sinon.spy(FunctionBuilder.prototype, 'lookupReturnType');
  try {
    const result = kernel(1.5);
    assert.equal(result[0], 3.5);
    assert.equal(FunctionBuilder.prototype.lookupReturnType.callCount, 5);
    assert.equal(FunctionBuilder.prototype.lookupReturnType.args[0][0], 'child1Function');
    assert.equal(FunctionBuilder.prototype.lookupReturnType.args[1][0], 'child2Function');
    assert.equal(FunctionBuilder.prototype.lookupReturnType.args[2][0], 'child3Function');
    assert.equal(FunctionBuilder.prototype.lookupReturnType.args[3][0], 'child2Function');
    assert.equal(FunctionBuilder.prototype.lookupReturnType.args[4][0], 'child3Function');
  } finally {
    FunctionBuilder.prototype.lookupReturnType.restore();
  }
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
  sinon.spy(FunctionBuilder.prototype, 'lookupReturnType');
  try {
    const result = kernel(1.5);
    assert.equal(result[0], 4.5);
    assert.equal(FunctionBuilder.prototype.lookupReturnType.callCount, 5);
    assert.equal(FunctionBuilder.prototype.lookupReturnType.args[0][0], 'child3Function');
    assert.equal(FunctionBuilder.prototype.lookupReturnType.args[1][0], 'child2Function');
    assert.equal(FunctionBuilder.prototype.lookupReturnType.args[2][0], 'child1Function');
    assert.equal(FunctionBuilder.prototype.lookupReturnType.args[3][0], 'child2Function');
    assert.equal(FunctionBuilder.prototype.lookupReturnType.args[4][0], 'child3Function');
  } finally {
    FunctionBuilder.prototype.lookupReturnType.restore();
  }
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

function threeArgumentLayerDeepNumberTexture1(mode) {
  const gpu = new GPU({ mode });
  const texture = gpu.createKernel(function() {
    return 1.5;
  }, { output: [1], pipeline: true, precision: 'single' })();
  function child1Function(child1FunctionArgument1) {
    return child1FunctionArgument1 + 1;
  }
  function child2Function(child2FunctionArgument1) {
    return child2FunctionArgument1 + 1;
  }
  function child3Function(child3FunctionArgument1) {
    return child3FunctionArgument1[this.thread.x] + 1;
  }
  gpu
    .addFunction(child1Function)
    .addFunction(child2Function)
    .addFunction(child3Function);
  const kernel = gpu.createKernel(function(kernelArgument1) {
    return child1Function(child2Function(child3Function(kernelArgument1)));
  }, { output: [1] });
  sinon.spy(FunctionBuilder.prototype, 'lookupReturnType');
  try {
    const result = kernel(texture);
    assert.equal(result[0], 4.5);
    assert.equal(FunctionBuilder.prototype.lookupReturnType.callCount, 5);
    assert.equal(FunctionBuilder.prototype.lookupReturnType.args[0][0], 'child3Function');
    assert.equal(FunctionBuilder.prototype.lookupReturnType.args[1][0], 'child2Function');
    assert.equal(FunctionBuilder.prototype.lookupReturnType.args[2][0], 'child1Function');
    assert.equal(FunctionBuilder.prototype.lookupReturnType.args[3][0], 'child2Function');
    assert.equal(FunctionBuilder.prototype.lookupReturnType.args[4][0], 'child3Function');
  } finally {
    FunctionBuilder.prototype.lookupReturnType.restore();
  }
}

(GPU.isSinglePrecisionSupported && GPU.isWebGLSupported ? test : skip)('three argument layer deep NumberTexture(1) WebGL', () => {
  threeArgumentLayerDeepNumberTexture1('webgl');
});
(GPU.isSinglePrecisionSupported && GPU.isWebGL2Supported ? test : skip)('three argument layer deep NumberTexture(1) WebGL2', () => {
  threeArgumentLayerDeepNumberTexture1('webgl2');
});
(GPU.isSinglePrecisionSupported && GPU.isHeadlessGLSupported ? test : skip)('three argument layer deep NumberTexture(1) HeadlessGL', () => {
  threeArgumentLayerDeepNumberTexture1('headlessgl');
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

function arrayTexture1(mode) {
  const gpu = new GPU({ mode });
  function addOne(functionValue) {
    return functionValue[this.thread.x] + 1;
  }
  gpu.addFunction(addOne);
  const texture1 = gpu.createKernel(function() {
    return 1;
  }, {
    output: [1],
    precision: 'single',
    pipeline: true,
  })();
  if (mode !== 'cpu') {
    assert.equal(texture1.type, 'ArrayTexture(1)');
  }

  const kernel = gpu.createKernel(function(kernelValue) {
    return addOne(kernelValue);
  }, { output: [1] });
  const result = kernel(texture1);
  assert.equal(result[0], 2);
  gpu.destroy();
}

(GPU.isSinglePrecisionSupported ? test : skip)('ArrayTexture(1) auto', ()=> {
  arrayTexture1();
});
(GPU.isSinglePrecisionSupported ? test : skip)('ArrayTexture(1) gpu', ()=> {
  arrayTexture1('gpu');
});
(GPU.isSinglePrecisionSupported && GPU.isWebGLSupported ? test : skip)('ArrayTexture(1) webgl', ()=> {
  arrayTexture1('webgl');
});
(GPU.isSinglePrecisionSupported && GPU.isWebGL2Supported ? test : skip)('ArrayTexture(1) webgl2', ()=> {
  arrayTexture1('webgl2');
});
(GPU.isSinglePrecisionSupported && GPU.isHeadlessGLSupported ? test : skip)('ArrayTexture(1) headlessgl', ()=> {
  arrayTexture1('headlessgl');
});
(GPU.isSinglePrecisionSupported ? test : skip)('ArrayTexture(1) cpu', ()=> {
  arrayTexture1('cpu');
});

function arrayTexture2(mode) {
  const gpu = new GPU({ mode });
  function addOne(functionValue) {
    const declaredValue = functionValue[this.thread.x];
    return declaredValue[0] + 1 + declaredValue[1] + 1;
  }
  gpu.addFunction(addOne);
  const texture1 = gpu.createKernel(function() {
    return [1,2];
  }, {
    output: [1],
    precision: 'single',
    pipeline: true,
  })();
  if (mode !== 'cpu') {
    assert.equal(texture1.type, 'ArrayTexture(2)');
  }

  const kernel = gpu.createKernel(function(kernelValue) {
    return addOne(kernelValue);
  }, { output: [1] });
  const result = kernel(texture1);
  assert.equal(result[0], 5);
  gpu.destroy();
}

(GPU.isSinglePrecisionSupported ? test : skip)('ArrayTexture(2) auto', ()=> {
  arrayTexture2();
});
(GPU.isSinglePrecisionSupported ? test : skip)('ArrayTexture(2) gpu', ()=> {
  arrayTexture2('gpu');
});
(GPU.isSinglePrecisionSupported && GPU.isWebGLSupported ? test : skip)('ArrayTexture(2) webgl', ()=> {
  arrayTexture2('webgl');
});
(GPU.isSinglePrecisionSupported && GPU.isWebGL2Supported ? test : skip)('ArrayTexture(2) webgl2', ()=> {
  arrayTexture2('webgl2');
});
(GPU.isSinglePrecisionSupported && GPU.isHeadlessGLSupported ? test : skip)('ArrayTexture(2) headlessgl', ()=> {
  arrayTexture2('headlessgl');
});
(GPU.isSinglePrecisionSupported ? test : skip)('ArrayTexture(2) cpu', ()=> {
  arrayTexture2('cpu');
});

function arrayTexture3(mode) {
  const gpu = new GPU({ mode });
  function addOne(functionValue) {
    const declaredValue = functionValue[this.thread.x];
    return declaredValue[0] + 1
      + declaredValue[1] + 1
      + declaredValue[2] + 1;
  }
  gpu.addFunction(addOne);
  const texture1 = gpu.createKernel(function() {
    return [1,2,3];
  }, {
    output: [1],
    precision: 'single',
    pipeline: true,
  })();
  if (mode !== 'cpu') {
    assert.equal(texture1.type, 'ArrayTexture(3)');
  }

  const kernel = gpu.createKernel(function(kernelValue) {
    return addOne(kernelValue);
  }, { output: [1] });
  const result = kernel(texture1);
  assert.equal(result[0], 9);
  gpu.destroy();
}

(GPU.isSinglePrecisionSupported ? test : skip)('ArrayTexture(3) auto', ()=> {
  arrayTexture3();
});
(GPU.isSinglePrecisionSupported ? test : skip)('ArrayTexture(3) gpu', ()=> {
  arrayTexture3('gpu');
});
(GPU.isSinglePrecisionSupported && GPU.isWebGLSupported ? test : skip)('ArrayTexture(3) webgl', ()=> {
  arrayTexture3('webgl');
});
(GPU.isSinglePrecisionSupported && GPU.isWebGL2Supported ? test : skip)('ArrayTexture(3) webgl2', ()=> {
  arrayTexture3('webgl2');
});
(GPU.isSinglePrecisionSupported && GPU.isHeadlessGLSupported ? test : skip)('ArrayTexture(3) headlessgl', ()=> {
  arrayTexture3('headlessgl');
});
(GPU.isSinglePrecisionSupported ? test : skip)('ArrayTexture(3) cpu', ()=> {
  arrayTexture3('cpu');
});

function arrayTexture4(mode) {
  const gpu = new GPU({ mode });
  function addOne(functionValue) {
    const declaredValue = functionValue[this.thread.x];
    return declaredValue[0] + 1
     + declaredValue[1] + 1
     + declaredValue[2] + 1
     + declaredValue[3] + 1;
  }
  gpu.addFunction(addOne);
  const texture1 = gpu.createKernel(function() {
    return [1,2,3,4];
  }, {
    output: [1],
    precision: 'single',
    pipeline: true,
  })();
  if (mode !== 'cpu') {
    assert.equal(texture1.type, 'ArrayTexture(4)');
  }

  const kernel = gpu.createKernel(function(kernelValue) {
    return addOne(kernelValue);
  }, { output: [1] });
  const result = kernel(texture1);
  assert.equal(result[0], 14);
  gpu.destroy();
}

(GPU.isSinglePrecisionSupported ? test : skip)('ArrayTexture(4) auto', ()=> {
  arrayTexture4();
});
(GPU.isSinglePrecisionSupported ? test : skip)('ArrayTexture(4) gpu', ()=> {
  arrayTexture4('gpu');
});
(GPU.isSinglePrecisionSupported && GPU.isWebGLSupported ? test : skip)('ArrayTexture(4) webgl', ()=> {
  arrayTexture4('webgl');
});
(GPU.isSinglePrecisionSupported && GPU.isWebGL2Supported ? test : skip)('ArrayTexture(4) webgl2', ()=> {
  arrayTexture4('webgl2');
});
(GPU.isSinglePrecisionSupported && GPU.isHeadlessGLSupported ? test : skip)('ArrayTexture(4) headlessgl', ()=> {
  arrayTexture4('headlessgl');
});
(GPU.isSinglePrecisionSupported ? test : skip)('ArrayTexture(4) cpu', ()=> {
  arrayTexture4('cpu');
});

function testTortureTest(mode) {
  const gpu = new GPU({ mode });
  function addFloatArray(addFloatArrayArgument1, addFloatArrayArgument2) {
    return addFloatArrayArgument1 + addFloatArrayArgument2[this.thread.x];
  }
  function addArrayFloat(addArrayFloatArgument1, addArrayFloatArgument2) {
    return addArrayFloatArgument1[this.thread.x] + addArrayFloatArgument2;
  }
  function addArrayArray(addArrayArrayArgument1, addArrayArrayArgument2) {
    return addArrayArrayArgument1[this.thread.x] + addArrayArrayArgument2[this.thread.x];
  }
  function addFloatFloat(addFloatFloatArgument1, addFloatFloatArgument2) {
    return addFloatFloatArgument1 + addFloatFloatArgument2;
  }
  gpu
    .addFunction(addFloatArray)
    .addFunction(addArrayFloat)
    .addFunction(addArrayArray)
    .addFunction(addFloatFloat);

  const texture = gpu.createKernel(function() { return 2; }, { output: [1], precision: 'single' })();
  // sinon.spy(FunctionBuilder.prototype, 'lookupArgumentType');
  sinon.spy(FunctionBuilder.prototype, 'lookupReturnType');

  try {
    const kernel = gpu.createKernel(function (v1, v2, v3, v4, v5) {
      return addFloatFloat(v4, addArrayFloat(v3, addFloatArray(addArrayArray(v1, v5), v2)));
    }, {output: [1]});

    const result = kernel([1], texture, [3], 4, new Float32Array([5]));
    assert.equal(result[0], 1 + 2 + 3 + 4 + 5);
    assert.equal(FunctionBuilder.prototype.lookupReturnType.callCount, 7);
    assert.equal(FunctionBuilder.prototype.lookupReturnType.returnValues.length, 7);
    assert.equal(FunctionBuilder.prototype.lookupReturnType.args[0][0], 'addArrayArray');
    assert.equal(FunctionBuilder.prototype.lookupReturnType.returnValues[0], 'Number');
    assert.equal(FunctionBuilder.prototype.lookupReturnType.args[1][0], 'addFloatArray');
    assert.equal(FunctionBuilder.prototype.lookupReturnType.returnValues[1], 'Number');
    assert.equal(FunctionBuilder.prototype.lookupReturnType.args[2][0], 'addArrayFloat');
    assert.equal(FunctionBuilder.prototype.lookupReturnType.returnValues[2], 'Number');
    assert.equal(FunctionBuilder.prototype.lookupReturnType.args[3][0], 'addFloatFloat');
    assert.equal(FunctionBuilder.prototype.lookupReturnType.returnValues[3], 'Float');
    assert.equal(FunctionBuilder.prototype.lookupReturnType.args[4][0], 'addArrayFloat');
    assert.equal(FunctionBuilder.prototype.lookupReturnType.returnValues[4], 'Number');
    assert.equal(FunctionBuilder.prototype.lookupReturnType.args[5][0], 'addFloatArray');
    assert.equal(FunctionBuilder.prototype.lookupReturnType.returnValues[5], 'Number');
    assert.equal(FunctionBuilder.prototype.lookupReturnType.args[6][0], 'addArrayArray');
    assert.equal(FunctionBuilder.prototype.lookupReturnType.returnValues[6], 'Number');
  } finally {
    FunctionBuilder.prototype.lookupReturnType.restore();
  }
}

(GPU.isSinglePrecisionSupported ? test : skip)('torture test auto', () => {
  testTortureTest();
});

(GPU.isSinglePrecisionSupported ? test : skip)('torture test gpu', () => {
  testTortureTest('gpu');
});

(GPU.isSinglePrecisionSupported && GPU.isWebGLSupported ? test : skip)('torture test webgl', () => {
  testTortureTest('webgl');
});

(GPU.isSinglePrecisionSupported && GPU.isWebGL2Supported ? test : skip)('torture test webgl2', () => {
  testTortureTest('webgl2');
});

(GPU.isSinglePrecisionSupported && GPU.isHeadlessGLSupported ? test : skip)('torture test headlessgl', () => {
  testTortureTest('headlessgl');
});

test('torture test cpu', () => {
  testTortureTest('cpu');
});

function testKernelMap(mode) {
  const gpu = new GPU({ mode });
  function calc1(v1, v2) {
    return v2[this.thread.x] - v1;
  }
  function calc2(v1, v2) {
    return v1 * v2;
  }
  const kernelMap = gpu.createKernelMap({
    calc1,
    calc2,
  }, function (outputs, targets) {
    const output = outputs[this.thread.x];
    return calc2(calc1(output, targets), output);
  }, { output: [1], pipeline: true });
  try {
    const result = kernelMap([1], [3]);
    assert.equal(result.calc1.toArray()[0], 2);
    assert.equal(result.calc2.toArray()[0], 2);
    assert.equal(result.result.toArray()[0], 2);
  } finally {
    gpu.destroy();
  }
}


(GPU.isWebGLSupported ? test : skip)('kernel map webgl', () => {
  testKernelMap('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('kernel map webgl2', () => {
  testKernelMap('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('kernel map headlessgl', () => {
  testKernelMap('headlessgl');
});
