const { assert, skip, test, module: describe, only } = require('qunit');
const { WebGLFunctionNode, WebGL2FunctionNode, CPUFunctionNode } = require('../../src');

describe('issue #390');

test('Issue #390 - thread assignment webgl', function(assert) {
  const node = new WebGLFunctionNode(function assignThreadToVar() {
    const x = this.thread.x;
    const y = this.thread.y;
    const sum = x + y;
    return sum;
  }.toString(), { output: [1], returnType: 'Number' });
  assert.equal(node.toString(), 'float assignThreadToVar() {'
    + '\nfloat user_x=float(threadId.x);'
    + '\nfloat user_y=float(threadId.y);'
    + '\nfloat user_sum=(user_x+user_y);'
    + '\nreturn user_sum;'
    + '\n}');
  const { x, y, sum } = node.contexts[1];
  assert.equal(x.name, 'x');
  assert.equal(x.valueType, 'Number');
  assert.equal(y.name, 'y');
  assert.equal(y.valueType, 'Number');
  assert.equal(sum.name, 'sum');
  assert.equal(sum.valueType, 'Number');
});

test('Issue #390 - thread assignment webgl2', function(assert) {
  const node = new WebGL2FunctionNode(function assignThreadToVar() {
    const x = this.thread.x;
    const y = this.thread.y;
    const sum = x + y;
    return sum;
  }.toString(), { output: [1], returnType: 'Number' });
  assert.equal(node.toString(), 'float assignThreadToVar() {'
    + '\nfloat user_x=float(threadId.x);'
    + '\nfloat user_y=float(threadId.y);'
    + '\nfloat user_sum=(user_x+user_y);'
    + '\nreturn user_sum;'
    + '\n}');
  const { x, y, sum } = node.contexts[1];
  assert.equal(x.name, 'x');
  assert.equal(x.valueType, 'Number');
  assert.equal(y.name, 'y');
  assert.equal(y.valueType, 'Number');
  assert.equal(sum.name, 'sum');
  assert.equal(sum.valueType, 'Number');
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
  const { x, y, z, sum } = node.contexts[1];
  assert.equal(x.name, 'x');
  assert.equal(x.valueType, 'Integer');
  assert.equal(y.name, 'y');
  assert.equal(y.valueType, 'Integer');
  assert.equal(sum.name, 'sum');
  assert.equal(sum.valueType, 'Number');
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
    + '\nfloat user_x=1.0;'
    + '\nfloat user_y=2.0;'
    + '\nfloat user_z=3.0;'
    + '\nfloat user_sum=((user_x+user_y)+user_z);'
    + '\nreturn user_sum;'
    + '\n}');
  const { x, y, z, sum } = node.contexts[1];
  assert.equal(x.name, 'x');
  assert.equal(x.valueType, 'Number');
  assert.equal(y.name, 'y');
  assert.equal(y.valueType, 'Number');
  assert.equal(z.name, 'z');
  assert.equal(z.valueType, 'Number');
  assert.equal(sum.name, 'sum');
  assert.equal(sum.valueType, 'Number');
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
    + '\nfloat user_x=1.0;'
    + '\nfloat user_y=2.0;'
    + '\nfloat user_z=3.0;'
    + '\nfloat user_sum=((user_x+user_y)+user_z);'
    + '\nreturn user_sum;'
    + '\n}');
  const context = node.contexts[1];
  const { x, y, z, sum } = context;
  assert.equal(x.name, 'x');
  assert.equal(x.valueType, 'Number');
  assert.equal(y.name, 'y');
  assert.equal(y.valueType, 'Number');
  assert.equal(z.name, 'z');
  assert.equal(z.valueType, 'Number');
  assert.equal(sum.name, 'sum');
  assert.equal(sum.valueType, 'Number');
});

test('Issue #390 (related) - output assignment cpu', function(assert) {
  const node = new CPUFunctionNode(`function assignThreadToVar() {
    const x = this.output.x;
    const y = this.output.y;
    const z = this.output.z;
    const sum = x + y + z;
    return sum;
  }`, {
    output: [1,2,3]
  });
  assert.equal(node.toString(), 'function assignThreadToVar() {'
    + '\nconst user_x=outputX;'
    + '\nconst user_y=outputY;'
    + '\nconst user_z=outputZ;'
    + '\nconst user_sum=((user_x+user_y)+user_z);'
    + '\nreturn user_sum;'
    + '\n}');
  const context = node.contexts[1];
  const { x, y, z, sum } = context;
  assert.equal(context['@contextType'], 'const/let');

  assert.equal(x.name, 'x');
  assert.equal(x.valueType, 'Number');

  assert.equal(y.name, 'y');
  assert.equal(y.valueType, 'Number');

  assert.equal(z.name, 'z');
  assert.equal(z.valueType, 'Number');

  assert.equal(sum.name, 'sum');
  assert.equal(sum.valueType, 'Number');
});

