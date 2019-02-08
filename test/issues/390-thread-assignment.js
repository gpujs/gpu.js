const { assert, skip, test, module: describe, only } = require('qunit');
const { WebGLFunctionNode, WebGL2FunctionNode, CPUFunctionNode } = require('../../src');

describe('issue #390');

test('Issue #390 - thread assignment webgl', function(assert) {
  const node = new WebGLFunctionNode(function assignThreadToVar() {
    const x = this.thread.x;
    const y = this.thread.y;
    const sum = x + y;
    return sum;
  }.toString(), { output: [1] });
  assert.equal(node.toString(), 'float assignThreadToVar() {'
    + '\nint user_x=threadId.x;'
    + '\nint user_y=threadId.y;'
    + '\nint user_sum=(user_x+user_y);'
    + '\nreturn float(user_sum);'
    + '\n}');
  assert.equal(node.declarations.x, 'Integer');
  assert.equal(node.declarations.y, 'Integer');
  assert.equal(node.declarations.sum, 'Integer');
});

test('Issue #390 - thread assignment webgl2', function(assert) {
  const node = new WebGL2FunctionNode(function assignThreadToVar() {
    const x = this.thread.x;
    const y = this.thread.y;
    const sum = x + y;
    return sum;
  }.toString(), { output: [1] });
  assert.equal(node.toString(), 'float assignThreadToVar() {'
    + '\nint user_x=threadId.x;'
    + '\nint user_y=threadId.y;'
    + '\nint user_sum=(user_x+user_y);'
    + '\nreturn float(user_sum);'
    + '\n}');
  assert.equal(node.declarations.x, 'Integer');
  assert.equal(node.declarations.y, 'Integer');
  assert.equal(node.declarations.sum, 'Integer');
});

test('Issue #390 - thread assignment cpu', function(assert) {
  const node = new CPUFunctionNode(function assignThreadToVar() {
    const x = this.thread.x;
    const y = this.thread.y;
    const sum = x + y;
    return sum;
  }.toString(), { output: [1] });
  assert.equal(node.toString(), 'function assignThreadToVar() {'
    + '\nconst user_x=_this.thread.x;'
    + '\nconst user_y=_this.thread.y;'
    + '\nconst user_sum=(user_x+user_y);'
    + '\nreturn user_sum;'
    + '\n}');
  assert.equal(node.declarations.x, 'Integer');
  assert.equal(node.declarations.y, 'Integer');
  assert.equal(node.declarations.sum, 'Integer');
});


test('Issue #390 (related) - output assignment webgl', function(assert) {
  const node = new WebGLFunctionNode(function assignThreadToVar() {
    const x = this.output.x;
    const y = this.output.y;
    const z = this.output.z;
    const sum = x + y + z;
    return sum;
  }.toString(), {
    output: [1,2,3]
  });
  assert.equal(node.toString(), 'float assignThreadToVar() {'
    + '\nint user_x=1;'
    + '\nint user_y=2;'
    + '\nint user_z=3;'
    + '\nint user_sum=((user_x+user_y)+user_z);'
    + '\nreturn float(user_sum);'
    + '\n}');
  assert.equal(node.declarations.x, 'Integer');
  assert.equal(node.declarations.y, 'Integer');
  assert.equal(node.declarations.z, 'Integer');
  assert.equal(node.declarations.sum, 'Integer');
});

test('Issue #390 (related) - output assignment webgl2', function(assert) {
  const node = new WebGL2FunctionNode(function assignThreadToVar() {
    const x = this.output.x;
    const y = this.output.y;
    const z = this.output.z;
    const sum = x + y + z;
    return sum;
  }.toString(), {
    output: [1,2,3]
  });
  assert.equal(node.toString(), 'float assignThreadToVar() {'
    + '\nint user_x=1;'
    + '\nint user_y=2;'
    + '\nint user_z=3;'
    + '\nint user_sum=((user_x+user_y)+user_z);'
    + '\nreturn float(user_sum);'
    + '\n}');
  assert.equal(node.declarations.x, 'Integer');
  assert.equal(node.declarations.y, 'Integer');
  assert.equal(node.declarations.z, 'Integer');
  assert.equal(node.declarations.sum, 'Integer');
});

test('Issue #390 (related) - output assignment cpu', function(assert) {
  const node = new CPUFunctionNode(function assignThreadToVar() {
    const x = this.output.x;
    const y = this.output.y;
    const z = this.output.z;
    const sum = x + y + z;
    return sum;
  }.toString(), {
    output: [1,2,3]
  });
  assert.equal(node.toString(), 'function assignThreadToVar() {'
    + '\nconst user_x=1;'
    + '\nconst user_y=2;'
    + '\nconst user_z=3;'
    + '\nconst user_sum=((user_x+user_y)+user_z);'
    + '\nreturn user_sum;'
    + '\n}');
  assert.equal(node.declarations.x, 'Integer');
  assert.equal(node.declarations.y, 'Integer');
  assert.equal(node.declarations.z, 'Integer');
  assert.equal(node.declarations.sum, 'Integer');
});

