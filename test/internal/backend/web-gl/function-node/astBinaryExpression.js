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

test('divide float & Input', () => {
  const node = new WebGLFunctionNode(`function kernel(left, right) {
    return left / right[this.thread.x];
  }`, {
    returnType: 'Number',
    output: [1],
    argumentTypes: ['Number', 'Input'],
    lookupFunctionArgumentBitRatio: () => 4,
  });

  assert.equal(node.toString(), 'float kernel(float user_left, sampler2D user_right,ivec2 user_rightSize,ivec3 user_rightDim) {'
    + '\nreturn (user_left/get32(user_right, user_rightSize, user_rightDim, 0, 0, threadId.x));'
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

test('divide int & Input', () => {
  const node = new WebGLFunctionNode(`function kernel(left, right) {
    return left / right[this.thread.x];
  }`, {
    returnType: 'Number',
    output: [1],
    argumentTypes: ['Integer', 'Input'],
    lookupFunctionArgumentBitRatio: () => 4,
  });

  assert.equal(node.toString(), 'float kernel(int user_left, sampler2D user_right,ivec2 user_rightSize,ivec3 user_rightDim) {'
    + '\nreturn float((user_left/int(get32(user_right, user_rightSize, user_rightDim, 0, 0, threadId.x))));'
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

test('divide literal integer & Input', () => {
  const node = new WebGLFunctionNode(`function kernel(v) {
    return 1 / v[this.thread.x];
  }`, {
    returnType: 'Number',
    output: [1],
    argumentTypes: ['Input'],
    lookupFunctionArgumentBitRatio: () => 4,
  });

  assert.equal(node.toString(), 'float kernel(sampler2D user_v,ivec2 user_vSize,ivec3 user_vDim) {'
    + '\nreturn (1.0/get32(user_v, user_vSize, user_vDim, 0, 0, threadId.x));'
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

test('divide literal float & Input', () => {
  const node = new WebGLFunctionNode(`function kernel(v) {
    return 1.1 / v[this.thread.x];
  }`, {
    returnType: 'Number',
    output: [1],
    argumentTypes: ['Input'],
    lookupFunctionArgumentBitRatio: () => 4,
  });

  assert.equal(node.toString(), 'float kernel(sampler2D user_v,ivec2 user_vSize,ivec3 user_vDim) {'
    + '\nreturn (1.1/get32(user_v, user_vSize, user_vDim, 0, 0, threadId.x));'
    + '\n}');
});

test('divide this.thread.x by this.output.x and multiple, integer, integer, and float with this.fixIntegerDivisionAccuracy = false', () => {
  const node = new WebGLFunctionNode(`function kernel() {
    return (this.thread.x / this.output.x) * 4;
  }`, {
    returnType: 'Number',
    output: [1],
    argumentTypes: [],
    lookupFunctionArgumentBitRatio: () => 4,
    fixIntegerDivisionAccuracy: false,
  });

  assert.equal(node.toString(), 'float kernel() {'
    + '\nreturn float(((threadId.x/1)*4));'
    + '\n}');
});

test('divide this.thread.x by this.output.x and multiple, integer, integer, and float with this.fixIntegerDivisionAccuracy = true', () => {
  const node = new WebGLFunctionNode(`function kernel() {
    return (this.thread.x / this.output.x) * 4;
  }`, {
    returnType: 'Number',
    output: [1],
    argumentTypes: [],
    lookupFunctionArgumentBitRatio: () => 4,
    fixIntegerDivisionAccuracy: true,
  });

  assert.equal(node.toString(), 'float kernel() {'
    + '\nreturn (divWithIntCheck(float(threadId.x), 1.0)*4.0);'
    + '\n}');
});

test('multiply Input and Input', () => {
  const node = new WebGLFunctionNode('function kernel(v1, v2) {'
    + '\n return v1[this.thread.x] * v2[this.thread.x];'
    + '\n}', {
    output: [1],
    argumentTypes: ['Input', 'Input'],
    lookupFunctionArgumentBitRatio: () => 4,
  });
  assert.equal(node.toString(), 'float kernel(sampler2D user_v1,ivec2 user_v1Size,ivec3 user_v1Dim, sampler2D user_v2,ivec2 user_v2Size,ivec3 user_v2Dim) {'
    + '\nreturn (get32(user_v1, user_v1Size, user_v1Dim, 0, 0, threadId.x)*get32(user_v2, user_v2Size, user_v2Dim, 0, 0, threadId.x));'
    + '\n}');
});

test('multiply Input and int', () => {
  const node = new WebGLFunctionNode('function kernel(v1, v2) {'
    + '\n return v1[this.thread.x] * v2;'
    + '\n}', {
    output: [1],
    argumentTypes: ['Input', 'Integer'],
    lookupFunctionArgumentBitRatio: () => 4,
  });
  assert.equal(node.toString(), 'float kernel(sampler2D user_v1,ivec2 user_v1Size,ivec3 user_v1Dim, int user_v2) {'
    + '\nreturn (get32(user_v1, user_v1Size, user_v1Dim, 0, 0, threadId.x)*float(user_v2));'
    + '\n}');
});

test('multiply Input and float', () => {
  const node = new WebGLFunctionNode('function kernel(v1, v2) {'
    + '\n return v1[this.thread.x] * v2;'
    + '\n}', {
    output: [1],
    argumentTypes: ['Input', 'Float'],
    lookupFunctionArgumentBitRatio: () => 4,
  });
  assert.equal(node.toString(), 'float kernel(sampler2D user_v1,ivec2 user_v1Size,ivec3 user_v1Dim, float user_v2) {'
    + '\nreturn (get32(user_v1, user_v1Size, user_v1Dim, 0, 0, threadId.x)*user_v2);'
    + '\n}');
});

test('multiply Input and Number', () => {
  const node = new WebGLFunctionNode('function kernel(v1, v2) {'
    + '\n return v1[this.thread.x] * v2;'
    + '\n}', {
    output: [1],
    argumentTypes: ['Input', 'Number'],
    lookupFunctionArgumentBitRatio: () => 4,
  });
  assert.equal(node.toString(), 'float kernel(sampler2D user_v1,ivec2 user_v1Size,ivec3 user_v1Dim, float user_v2) {'
    + '\nreturn (get32(user_v1, user_v1Size, user_v1Dim, 0, 0, threadId.x)*user_v2);'
    + '\n}');
});
