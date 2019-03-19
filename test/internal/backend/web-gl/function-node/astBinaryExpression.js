const { assert, test, module: describe, only } = require('qunit');
const { WebGLFunctionNode } = require(process.cwd() + '/src');

describe('WebGLFunctionNode.astBinaryExpression()');


test('divide float & float', () => {
  const node = new WebGLFunctionNode(`function kernel(left, right) {
    return left / right;
  }`, {
    returnType: 'Number',
    output: [1],
    argumentTypes: ['Number', 'Number']
  });

  assert.equal(node.toString(), 'float kernel(float user_left, float user_right) {'
    + '\nreturn (user_left/user_right);'
    + '\n}');
});

test('divide float & int', () => {
  const node = new WebGLFunctionNode(`function kernel(left, right) {
    return left / right;
  }`, {
    returnType: 'Number',
    output: [1],
    argumentTypes: ['Number', 'Integer']
  });

  assert.equal(node.toString(), 'float kernel(float user_left, int user_right) {'
    + '\nreturn (user_left/float(user_right));'
    + '\n}');
});

test('divide float & literal float', () => {
  const node = new WebGLFunctionNode(`function kernel(left) {
    return left / 1.1;
  }`, {
    returnType: 'Number',
    output: [1],
    argumentTypes: ['Number']
  });

  assert.equal(node.toString(), 'float kernel(float user_left) {'
    + '\nreturn (user_left/1.1);'
    + '\n}');
});

test('divide float & literal integer', () => {
  const node = new WebGLFunctionNode(`function kernel(left) {
    return left / 1;
  }`, {
    returnType: 'Number',
    output: [1],
    argumentTypes: ['Number']
  });

  assert.equal(node.toString(), 'float kernel(float user_left) {'
    + '\nreturn (user_left/1.0);'
    + '\n}');
});

test('divide int & float', () => {
  const node = new WebGLFunctionNode(`function kernel(left, right) {
    return left / right;
  }`, {
    returnType: 'Number',
    output: [1],
    argumentTypes: ['Integer', 'Number']
  });

  assert.equal(node.toString(), 'float kernel(int user_left, float user_right) {'
    + '\nreturn float((user_left/int(user_right)));'
    + '\n}');
});

test('divide int & int', () => {
  const node = new WebGLFunctionNode(`function kernel(left, right) {
    return left / right;
  }`, {
    returnType: 'Number',
    output: [1],
    argumentTypes: ['Integer', 'Integer']
  });

  assert.equal(node.toString(), 'float kernel(int user_left, int user_right) {'
    + '\nreturn float((user_left/user_right));'
    + '\n}');
});

test('divide int & literal float', () => {
  const node = new WebGLFunctionNode(`function kernel(left) {
    return left / 1.1;
  }`, {
    returnType: 'Number',
    output: [1],
    argumentTypes: ['Integer']
  });

  assert.equal(node.toString(), 'float kernel(int user_left) {'
    + '\nreturn float((user_left/1));'
    + '\n}');
});

test('divide int & literal integer', () => {
  const node = new WebGLFunctionNode(`function kernel(left) {
    return left / 1;
  }`, {
    returnType: 'Number',
    output: [1],
    argumentTypes: ['Integer']
  });

  assert.equal(node.toString(), 'float kernel(int user_left) {'
    + '\nreturn float((user_left/1));'
    + '\n}');
});

test('divide literal integer & float', () => {
  const node = new WebGLFunctionNode(`function kernel(left) {
    return 1 / left;
  }`, {
    returnType: 'Number',
    output: [1],
    argumentTypes: ['Number']
  });

  assert.equal(node.toString(), 'float kernel(float user_left) {'
    + '\nreturn (1.0/user_left);'
    + '\n}');
});

test('divide literal integer & int', () => {
  const node = new WebGLFunctionNode(`function kernel(left) {
    return 1 / left;
  }`, {
    returnType: 'Number',
    output: [1],
    argumentTypes: ['Integer']
  });

  assert.equal(node.toString(), 'float kernel(int user_left) {'
    + '\nreturn float((1/user_left));'
    + '\n}');
});

test('divide literal integer & literal float', () => {
  const node = new WebGLFunctionNode(`function kernel() {
    return 1 / 1.1;
  }`, {
    returnType: 'Number',
    output: [1],
    argumentTypes: []
  });

  assert.equal(node.toString(), 'float kernel() {'
    + '\nreturn (1.0/1.1);'
    + '\n}');
});

test('divide literal integer & literal integer', () => {
  const node = new WebGLFunctionNode(`function kernel() {
    return 1 / 1;
  }`, {
    returnType: 'Number',
    output: [1],
    argumentTypes: []
  });

  assert.equal(node.toString(), 'float kernel() {'
    + '\nreturn (1.0/1.0);'
    + '\n}');
});

test('divide literal float & float', () => {
  const node = new WebGLFunctionNode(`function kernel(right) {
    return 1.1 / right;
  }`, {
    returnType: 'Number',
    output: [1],
    argumentTypes: ['Number']
  });

  assert.equal(node.toString(), 'float kernel(float user_right) {'
    + '\nreturn (1.1/user_right);'
    + '\n}');
});

test('divide literal float & int', () => {
  const node = new WebGLFunctionNode(`function kernel(right) {
    return 1.1 / right;
  }`, {
    returnType: 'Number',
    output: [1],
    argumentTypes: ['Integer']
  });

  assert.equal(node.toString(), 'float kernel(int user_right) {'
    + '\nreturn (1.1/float(user_right));'
    + '\n}');
});

test('divide literal float & literal float', () => {
  const node = new WebGLFunctionNode(`function kernel() {
    return 1.1 / 1.1;
  }`, {
    returnType: 'Number',
    output: [1],
    argumentTypes: []
  });

  assert.equal(node.toString(), 'float kernel() {'
    + '\nreturn (1.1/1.1);'
    + '\n}');
});

test('divide literal float & literal integer', () => {
  const node = new WebGLFunctionNode(`function kernel() {
    return 1.1 / 1;
  }`, {
    returnType: 'Number',
    output: [1],
    argumentTypes: []
  });

  assert.equal(node.toString(), 'float kernel() {'
    + '\nreturn (1.1/1.0);'
    + '\n}');
});

