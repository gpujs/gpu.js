const { assert, test, module: describe, only } = require('qunit');
const { WebGLFunctionNode } = require(process.cwd() + '/src');

describe('WebGLFunctionNode.astCallExpression()');

test('handles Math.abs with floats', () => {
  const node = new WebGLFunctionNode(`function kernel(v) {
    return Math.abs(v);
  }`, { output: [1], argumentTypes: ['Number'] });
  assert.equal(node.toString(), 'float kernel(float user_v) {'
    + '\nreturn abs(user_v);'
    + '\n}');
});
test('handles Math.abs with ints', () => {
  const node = new WebGLFunctionNode(`function kernel(v) {
    return Math.abs(v);
  }`, { output: [1], argumentTypes: ['Integer'] });
  assert.equal(node.toString(), 'float kernel(int user_v) {'
    + '\nreturn abs(float(user_v));'
    + '\n}');
});
test('handles Math.pow with floats', () => {
  const node = new WebGLFunctionNode(`function kernel(v, v2) {
    return Math.pow(v, v2);
  }`, { output: [1], argumentTypes: ['Number', 'Number'] });
  assert.equal(node.toString(), 'float kernel(float user_v, float user_v2) {'
    + '\nreturn pow(user_v, user_v2);'
    + '\n}');
});
test('handles Math.pow with mixed 1', () => {
  const node = new WebGLFunctionNode(`function kernel(v, v2) {
    return Math.pow(v, v2);
  }`, { output: [1], argumentTypes: ['Number', 'Integer'] });
  assert.equal(node.toString(), 'float kernel(float user_v, int user_v2) {'
    + '\nreturn pow(user_v, float(user_v2));'
    + '\n}');
});
test('handles Math.pow with mixed 2', () => {
  const node = new WebGLFunctionNode(`function kernel(v, v2) {
    return Math.pow(v, v2);
  }`, { output: [1], argumentTypes: ['Integer', 'Number'] });
  assert.equal(node.toString(), 'float kernel(int user_v, float user_v2) {'
    + '\nreturn pow(float(user_v), user_v2);'
    + '\n}');
});
test('handles Math.pow with ints', () => {
  const node = new WebGLFunctionNode(`function kernel(v, v2) {
    return Math.pow(v, v2);
  }`, { output: [1], argumentTypes: ['Integer', 'Integer'] });
  assert.equal(node.toString(), 'float kernel(int user_v, int user_v2) {'
    + '\nreturn pow(float(user_v), float(user_v2));'
    + '\n}');
});
