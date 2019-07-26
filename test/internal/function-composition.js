const { assert, test, skip, module: describe, only } = require('qunit');
const sinon = require('sinon');
const { CPUFunctionNode, FunctionBuilder, GPU, WebGL2FunctionNode, WebGLFunctionNode } = require('../../src');

describe('internal: function composition return values');

function functionCompositionReturnValuesTest(mode) {
  const gpu = new GPU({ mode });
  return gpu.createKernel(function(oneToFour, fourToOne) {
    function add(left, right) {
      return left[this.thread.x] + right[this.thread.x];
    }
    return add(oneToFour, fourToOne);
  }, { output: [4] })([1,2,3,4], [4,3,2,1]);
}

test('auto', () => {
  assert.deepEqual(Array.from(functionCompositionReturnValuesTest()), [5,5,5,5]);
});
test('gpu', () => {
  assert.deepEqual(Array.from(functionCompositionReturnValuesTest('gpu')), [5,5,5,5]);
});
(GPU.isWebGLSupported ? test : skip)('webgl', () => {
  assert.deepEqual(Array.from(functionCompositionReturnValuesTest('webgl')), [5,5,5,5]);
});
(GPU.isWebGL2Supported ? test : skip)('webgl2', () => {
  assert.deepEqual(Array.from(functionCompositionReturnValuesTest('webgl2')), [5,5,5,5]);
});
(GPU.isHeadlessGLSupported ? test : skip)('headlessgl', () => {
  assert.deepEqual(Array.from(functionCompositionReturnValuesTest('headlessgl')), [5,5,5,5]);
});
test('cpu', () => {
  assert.deepEqual(Array.from(functionCompositionReturnValuesTest('cpu')), [5,5,5,5]);
});


describe('internal: function composition FunctionNode');

function functionCompositionFunctionNode(FunctionNode) {
  const output = [1];
  const node = new FunctionNode(`function kernel() {
    function inner() { return 1; }
    
    return inner();
  }`, {
    output,
    onNestedFunction: sinon.spy(),
    lookupReturnType: () => 'Number',
    lookupFunctionArgumentTypes: () => {}
  });

  const string = node.toString();
  assert.equal(node.onNestedFunction.callCount, 1);
  return string;
}

test('CPUFunctionNode', () => {
  assert.equal(functionCompositionFunctionNode(CPUFunctionNode), 'function kernel() {'
    + '\n'
    + '\nreturn inner();'
    + '\n}');
});
test('WebGLFunctionNode', () => {
  assert.equal(functionCompositionFunctionNode(WebGLFunctionNode), 'float kernel() {'
    + '\n'
    + '\nreturn inner();'
    + '\n}');
});
test('WebGL2FunctionNode', () => {
  assert.equal(functionCompositionFunctionNode(WebGL2FunctionNode), 'float kernel() {'
    + '\n'
    + '\nreturn inner();'
    + '\n}');
});

describe('internal: number function composition FunctionBuilder');

function numberFunctionCompositionFunctionBuilder(FunctionNode) {
  const output = [1];
  const builder = FunctionBuilder.fromKernel({
    source: `function kernel() {
    function inner() { return 1; }
    
    return inner();
  }`,
    argumentTypes: [],
    argumentNames: [],
    kernelArguments: [],
    kernelConstants: [],
    output,
    leadingReturnStatement: 'resultX[x] = '
  }, FunctionNode);

  return builder.getPrototypeString('kernel');
}

test('CPUFunctionNode', () => {
  assert.equal(numberFunctionCompositionFunctionBuilder(CPUFunctionNode), 'function inner() {'
    + '\nreturn 1;'
    + '\n}'
    + '\nresultX[x] = inner();\ncontinue;');
});
test('WebGLFunctionNode', () => {
  assert.equal(numberFunctionCompositionFunctionBuilder(WebGLFunctionNode), 'float inner() {'
    + '\nreturn 1.0;'
    + '\n}'
    + '\nvoid kernel() {'
    + '\n'
    + '\nkernelResult = inner();return;'
    + '\n}');
});
test('WebGL2FunctionNode', () => {
  assert.equal(numberFunctionCompositionFunctionBuilder(WebGL2FunctionNode), 'float inner() {'
    + '\nreturn 1.0;'
    + '\n}'
    + '\nvoid kernel() {'
    + '\n'
    + '\nkernelResult = inner();return;'
    + '\n}');
});

describe('internal: Array(2) function composition FunctionBuilder');

function array2FunctionCompositionFunctionBuilder(FunctionNode) {
  const output = [1];
  const builder = FunctionBuilder.fromKernel({
    source: `function kernel() {
    function inner() { return [1,2,3,4]; }
    
    return inner()[0];
  }`,
    argumentTypes: [],
    argumentNames: [],
    kernelArguments: [],
    kernelConstants: [],
    output,
    leadingReturnStatement: 'resultX[x] = '
  }, FunctionNode);

  return builder.getPrototypeString('kernel');
}

test('CPUFunctionNode', () => {
  assert.equal(array2FunctionCompositionFunctionBuilder(CPUFunctionNode), 'function inner() {'
    + '\nreturn new Float32Array([1, 2, 3, 4]);'
    + '\n}'
    + '\nresultX[x] = inner()[0];\ncontinue;');
});
test('WebGLFunctionNode', () => {
  assert.equal(array2FunctionCompositionFunctionBuilder(WebGLFunctionNode), 'vec4 inner() {'
  + '\nreturn vec4(1.0, 2.0, 3.0, 4.0);'
  + '\n}'
  + '\nvoid kernel() {'
  + '\n'
  + '\nkernelResult = inner()[0];return;'
  + '\n}');
});
test('WebGL2FunctionNode', () => {
  assert.equal(array2FunctionCompositionFunctionBuilder(WebGL2FunctionNode), 'vec4 inner() {'
    + '\nreturn vec4(1.0, 2.0, 3.0, 4.0);'
    + '\n}'
    + '\nvoid kernel() {'
    + '\n'
    + '\nkernelResult = inner()[0];return;'
    + '\n}');
});
