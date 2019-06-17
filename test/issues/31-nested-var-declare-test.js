const { assert, skip, test, module: describe, only } = require('qunit');
const { GPU, FunctionBuilder, WebGLFunctionNode, WebGL2FunctionNode, CPUFunctionNode } = require('../../src');

describe('issue #31 redeclare');

// nested redeclare
function nestedVarRedeclareFunction() {
  let result = 0;

  // outer loop limit is effectively skipped in CPU
  for(let i=0; i<10; ++i) {
    // inner loop limit should be higher, to avoid infinite loops
    for(i=0; i<20; ++i) {
      result += 1;
    }
  }

  return result;
}

function nestedVarRedeclareTest(mode) {
  const gpu = new GPU({ mode });
  const f = gpu.createKernel(nestedVarRedeclareFunction, {
    output: [1],
  });
  assert.throws(() => {
    f();
  });
  gpu.destroy();
}

test('Issue #31 - nestedVarRedeclare auto', () => {
  nestedVarRedeclareTest(null);
});

test('Issue #31 - nestedVarRedeclare gpu', () => {
  nestedVarRedeclareTest('gpu');
});

(GPU.isWebGLSupported ? test : skip)('Issue #31 - nestedVarRedeclare webgl', () => {
  nestedVarRedeclareTest('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('Issue #31 - nestedVarRedeclare webgl2', () => {
  nestedVarRedeclareTest('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('Issue #31 - nestedVarRedeclare headlessgl', () => {
  nestedVarRedeclareTest('headlessgl');
});

test('Issue #31 - nestedVarRedeclare cpu', () => {
  nestedVarRedeclareTest('cpu');
});

test('Issue #31 - nestedVarRedeclare : AST handling webgl', () => {
  const builder = new FunctionBuilder({
    functionNodes: [new WebGLFunctionNode(nestedVarRedeclareFunction.toString(), { output: [1] })],
    output: [1]
  });
  assert.throws(() => {
    builder.getStringFromFunctionNames(['nestedVarRedeclareFunction']);
  });
});

test('Issue #31 - nestedVarRedeclare : AST handling webgl2', () => {
  const builder = new FunctionBuilder({
    functionNodes: [new WebGL2FunctionNode(nestedVarRedeclareFunction.toString(), { output: [1] })],
    output: [1]
  });
  assert.throws(() => {
    builder.getStringFromFunctionNames(['nestedVarRedeclareFunction']);
  });
});

test('Issue #31 - nestedVarRedeclare : AST handling cpu', () => {
  const builder = new FunctionBuilder({
    functionNodes: [new CPUFunctionNode(nestedVarRedeclareFunction.toString(), { output: [1] })],
    output: [1]
  });
  assert.throws(() => {
    builder.getStringFromFunctionNames(['nestedVarRedeclareFunction']);
  });
});


describe('issue #31 nested declare');
// nested declare
function nestedVarDeclareFunction() {
  let result = 0.0;

  // outer loop limit is effectively skipped in CPU
  for(let i=0; i<10; ++i) {
    // inner loop limit should be higher, to avoid infinite loops
    for(let i=0; i<20; ++i) {
      result += 1;
    }
  }

  return result;
}

function nestedVarDeclareTest(mode ) {
  const gpu = new GPU({ mode });
  const f = gpu.createKernel(nestedVarDeclareFunction, {
    output : [1]
  });

  assert.equal(f(), 200, 'basic return function test');
  gpu.destroy();
}

test('Issue #31 - nestedVarDeclare auto', () => {
  nestedVarDeclareTest(null);
});

test('Issue #31 - nestedVarDeclare gpu', () => {
  nestedVarDeclareTest('gpu');
});

(GPU.isWebGLSupported ? test : skip)('Issue #31 - nestedVarDeclare webgl', () => {
  nestedVarDeclareTest('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('Issue #31 - nestedVarDeclare webgl2', () => {
  nestedVarDeclareTest('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('Issue #31 - nestedVarDeclare headlessgl', () => {
  nestedVarDeclareTest('headlessgl');
});

test('Issue #31 - nestedVarDeclare cpu', () => {
  nestedVarDeclareTest('cpu');
});

test('Issue #31 - nestedVarDeclare : AST handling webgl', () => {
  const builder = new FunctionBuilder({
    functionNodes: [new WebGLFunctionNode(nestedVarDeclareFunction.toString(), { output: [1] })]
  });

  assert.equal(
    builder.getStringFromFunctionNames(['nestedVarDeclareFunction']),
    'float nestedVarDeclareFunction() {'
    + '\nfloat user_result=0.0;'
    + '\nfor (int user_i=0;(user_i<10);++user_i){'
    + '\nfor (int user_i=0;(user_i<20);++user_i){' //<-- Note: don't do this in real life!
    + '\nuser_result+=1.0;}'
    + '\n}'
    + '\n'
    + '\nreturn user_result;'
    + '\n}'
  );
});

test('Issue #31 - nestedVarDeclare : AST handling webgl2', () => {
  const builder = new FunctionBuilder({
    functionNodes: [new WebGL2FunctionNode(nestedVarDeclareFunction.toString(), { output: [1] })]
  });

  assert.equal(
    builder.getStringFromFunctionNames(['nestedVarDeclareFunction']),
    'float nestedVarDeclareFunction() {'
    + '\nfloat user_result=0.0;'
    + '\nfor (int user_i=0;(user_i<10);++user_i){'
    + '\nfor (int user_i=0;(user_i<20);++user_i){' //<-- Note: don't do this in real life!
    + '\nuser_result+=1.0;}'
    + '\n}'
    + '\n'
    + '\nreturn user_result;'
    + '\n}'
  );
});

test('Issue #31 - nestedVarDeclare : AST handling cpu', () => {
  const builder = new FunctionBuilder({
    functionNodes: [new CPUFunctionNode(nestedVarDeclareFunction.toString(), { output: [1] })]
  });

  assert.equal(
    builder.getStringFromFunctionNames(['nestedVarDeclareFunction']),
    'function nestedVarDeclareFunction() {'
    + '\nlet user_result=0;'
    + '\nfor (let user_i=0;(user_i<10);++user_i){'
    + '\nfor (let user_i=0;(user_i<20);++user_i){'
    + '\nuser_result+=1;}'
    + '\n}'
    + '\n'
    + '\nreturn user_result;'
    + '\n}'
  );
});
