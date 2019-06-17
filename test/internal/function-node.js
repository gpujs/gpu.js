const { assert, test, module: describe, only } = require('qunit');
const { CPUFunctionNode, WebGLFunctionNode, WebGL2FunctionNode } = require('../../src');

describe('internal: function node');

/// Test the creation of a hello_world function
test('hello_world: just return magic 42 cpu', () => {
  // Create a function hello node
  const node = new CPUFunctionNode(
    (function() {
      return 42;
    }).toString(), { name: 'hello_world', output: [1] }
  );

  assert.notEqual(node.getJsAST(), null, 'AST fetch check');

  assert.equal(
    node.toString(),
    'function hello_world() {'
    + '\nreturn 42;'
    + '\n}',
    'function conversion check'
  );
});

test('hello_world: just return magic 42 webgl', () => {
  // Create a function hello node
  const node = new WebGLFunctionNode(
    (function() {
      return 42;
    }).toString(), { name: 'hello_world', output: [1] }
  );

  assert.notEqual(node.getJsAST(), null, 'AST fetch check');

  assert.equal(
    node.toString(),
    'float hello_world() {'
    + '\nreturn 42.0;'
    + '\n}',
    'function conversion check'
  );
});

test('hello_world: just return magic 42 webgl2', () => {
  // Create a function hello node
  const node = new WebGL2FunctionNode(
    (function() {
      return 42;
    }).toString(), { name: 'hello_world', output: [1] }
  );

  assert.notEqual(node.getJsAST(), null, 'AST fetch check');

  assert.equal(
    node.toString(),
    'float hello_world() {'
    + '\nreturn 42.0;'
    + '\n}',
    'function conversion check'
  );
});

/// Test creation of function, that calls another function
test('hello_inner: call a function inside a function cpu', () => {
  function inner() {
    return 42;
  }

  // Create a function hello node
  const node = new CPUFunctionNode(
    (function() {
      return inner();
    }).toString(),
    {
      name: 'hello_inner',
      output: [1],
      lookupReturnType: () => 'Number',
      lookupFunctionArgumentTypes: () => {}
    }
  );

  assert.notEqual(node.getJsAST(), null, 'AST fetch check');

  assert.equal(
    node.toString(),
    'function hello_inner() {'
    + '\nreturn inner();'
    + '\n}',
    'function conversion check'
  );

  assert.deepEqual(node.calledFunctions, ['inner'] );
});

test('hello_inner: call a function inside a function webgl', () => {
  function inner() {
    return 42;
  }

  // Create a function hello node
  const node = new WebGLFunctionNode(
    (function() {
      return inner();
    }).toString(), {
      name: 'hello_inner',
      output: [1],
      lookupReturnType: () => 'Number',
      lookupFunctionArgumentTypes: () => {}
    }
  );

  assert.notEqual(node.getJsAST(), null, 'AST fetch check');

  assert.equal(
    node.toString(),
    'float hello_inner() {'
    + '\nreturn inner();'
    + '\n}',
    'function conversion check'
  );

  assert.deepEqual(node.calledFunctions, ['inner'] );
});

/// Test creation of function, that calls another function
test('hello_inner: call a function inside a function webgl2', () => {
  function inner() {
    return 42;
  }

  // Create a function hello node
  const node = new WebGL2FunctionNode(
    (function() {
      return inner();
    }).toString(), {
      name: 'hello_inner',
      output: [1],
      lookupReturnType: () => 'Number',
      lookupFunctionArgumentTypes: () => {}
    }
  );

  assert.notEqual(node.getJsAST(), null, 'AST fetch check');

  assert.equal(
    node.toString(),
    'float hello_inner() {'
    + '\nreturn inner();'
    + '\n}',
    'function conversion check'
  );

  assert.deepEqual(node.calledFunctions, ['inner'] );
});

/// Test creation of function, that calls another function, with ARGS
test('Math.round implementation: A function with arguments cpu', () => {
  // Math.round node
  const node = new CPUFunctionNode(
    (function(a) {
      return Math.floor(a + 0.5);
    }).toString(),
    {
      name: 'foo',
      output: [1],
      argumentTypes: ['Number'],
      lookupFunctionArgumentTypes: () => {},
      triggerImplyArgumentType: () => {},
    }
  );

  assert.notEqual(node.getJsAST(), null, 'AST fetch check');

  assert.equal(
    node.toString(),
    'function foo(user_a) {'
    + '\nreturn Math.floor((user_a+0.5));'
    + '\n}',
    'function conversion check'
  );

  assert.deepEqual(node.calledFunctions, ['Math.floor']);
});

test('Math.round implementation: A function with arguments webgl', () => {
  // Math.round node
  const node = new WebGLFunctionNode(
    (function(a) {
      return Math.floor(a + 0.5);
    }).toString(), {
      name: 'foo',
      output: [1],
      argumentTypes: ['Number']
    }
  );

  assert.notEqual(node.getJsAST(), null, 'AST fetch check');

  assert.equal(
    node.toString(),
    'float foo(float user_a) {'
    + '\nreturn floor((user_a+0.5));'
    + '\n}',
    'function conversion check'
  );

  assert.deepEqual(node.calledFunctions, ['floor'] );
});

test('Math.round implementation: A function with arguments webgl2', () => {
  // Math.round node
  const node = new WebGL2FunctionNode(
    (function(a) {
      return Math.floor(a + 0.5);
    }).toString(), {
      name: 'foo',
      output: [1],
      argumentTypes: ['Number']
    }
  );

  assert.notEqual(node.getJsAST(), null, 'AST fetch check');

  assert.equal(
    node.toString(),
    'float foo(float user_a) {'
    + '\nreturn floor((user_a+0.5));'
    + '\n}',
    'function conversion check'
  );

  assert.deepEqual(node.calledFunctions, ['floor'] );
});

/// Test creation of function, that calls another function, with ARGS
test('Two arguments test webgl', function(assert){
  const node = new WebGLFunctionNode(
    (function(a,b) {
      return a+b;
    }).toString(), {
      name: 'add_together',
      output: [1],
      argumentTypes: ['Number', 'Number']
    }
  );

  assert.notEqual(node.getJsAST(), null, 'AST fetch check');

  assert.equal(
    node.toString(),
    'float add_together(float user_a, float user_b) {'
    + '\nreturn (user_a+user_b);'
    + '\n}',
    'function conversion check'
  );
});

test('Two arguments test webgl2', function(assert){
  const node = new WebGL2FunctionNode(
    (function(a,b) {
      return a+b;
    }).toString(), {
      name: 'add_together',
      output: [1],
      argumentTypes: ['Number', 'Number']
    }
  );

  assert.notEqual(node.getJsAST(), null, 'AST fetch check');

  assert.equal(
    node.toString(),
    'float add_together(float user_a, float user_b) {'
    + '\nreturn (user_a+user_b);'
    + '\n}',
    'function conversion check'
  );
});

/// Test the creation of a hello_world function
test('Automatic naming support cpu', () => {
  function hello_world() {
    return 42;
  }
  // Create a function hello node
  const node = new CPUFunctionNode(hello_world.toString(), { output: [1] });
  assert.notEqual(node, null, 'class creation check');
  assert.equal(node.name, 'hello_world');
});

test('Automatic naming support webgl', () => {
  function hello_world() {
    return 42;
  }
  // Create a function hello node
  const node = new WebGLFunctionNode(hello_world.toString(), { output: [1] });
  assert.notEqual(node, null, 'class creation check');
  assert.equal(node.name, 'hello_world');
});

test('Automatic naming support webgl2', () => {
  function hello_world() {
    return 42;
  }
  // Create a function hello node
  const node = new WebGL2FunctionNode(hello_world.toString(), { output: [1] });
  assert.notEqual(node, null, 'class creation check');
  assert.equal(node.name, 'hello_world');
});
