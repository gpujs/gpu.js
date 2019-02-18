const { assert, test, module: describe, only } = require('qunit');
const { WebGLFunctionNode } = require(process.cwd() + '/src');

describe('WebGLFunctionNode.getVariableSignature()');

function run(value, settings) {
  const node = new WebGLFunctionNode(`function fn() {
    ${ value };
  }`, Object.assign({ output: [1, 2, 3] }, settings));

  const ast = node.getJsAST();
  assert.equal(ast.type, 'FunctionExpression');
  assert.equal(ast.body.type, 'BlockStatement');
  assert.equal(ast.body.body[0].type, 'VariableDeclaration');
  return node.astVariableDeclaration(ast.body.body[0], []).join('');
}

test('value float', () => {
  assert.equal(run('const value = it', {
    argumentNames: ['it'],
    argumentTypes: ['Number']
  }), 'float user_value=user_it;');
});

test('value int', () => {
  assert.equal(run('const value = it', {
    argumentNames: ['it'],
    argumentTypes: ['Integer']
  }), 'float user_value=float(user_it);');
});

test('value[] float', () => {
  assert.equal(run('const value = it[1]', {
    argumentNames: ['it'],
    argumentTypes: ['Array']
  }), 'float user_value=get(user_it, user_itSize, user_itDim, user_itBitRatio, 0, 0, 1);');
});

test('value[][] float', () => {
  assert.equal(run('const value = it[1][2]', {
    argumentNames: ['it'],
    argumentTypes: ['Array2D']
  }), 'float user_value=get(user_it, user_itSize, user_itDim, user_itBitRatio, 0, 1, 2);');
});

test('value[][][] float', () => {
  assert.equal(run('const value = it[1][2][3]', {
    argumentNames: ['it'],
    argumentTypes: ['Array3D']
  }), 'float user_value=get(user_it, user_itSize, user_itDim, user_itBitRatio, 1, 2, 3);');
});

test('this.constant.value throws', () => {
  assert.throws(() => {
    run('const value=this.constant.it');
  });
});

test('this.constants.value without constantTypes declared', () => {
  assert.throws(() => {
    run('const value=this.constants.it')
  });
});

test('this.constants.value float', () => {
  assert.equal(run('const value = this.constants.it', {
    constantTypes: { it: 'Number' }
  }), 'float user_value=constants_it;');
});

test('this.constants.value int', () => {
  assert.equal(run('const value = this.constants.it', {
    constantTypes: {
      it: 'Integer'
    }
  }), 'float user_value=float(constants_it);');
});

test('this.constants.value[] float', () => {
  assert.equal(run('const value = this.constants.it[1]', {
    constantTypes: {
      it: 'Array'
    }
  }), 'float user_value=get(constants_it, constants_itSize, constants_itDim, constants_itBitRatio, 0, 0, 1);');
});

test('this.constants.value[][] float', () => {
  assert.equal(run('const value = this.constants.it[1][2]', {
    constantTypes: {
      it: 'Array2D'
    }
  }), 'float user_value=get(constants_it, constants_itSize, constants_itDim, constants_itBitRatio, 0, 1, 2);');
});

test('this.constants.value[][][] float', () => {
  assert.equal(run('const value = this.constants.it[1][2][3]', {
    constantTypes: {
      it: 'Array3D'
    }
  }), 'float user_value=get(constants_it, constants_itSize, constants_itDim, constants_itBitRatio, 1, 2, 3);');
});

test('this.thread.x float', () => {
  assert.equal(run('const value = this.thread.x'), 'float user_value=float(threadId.x);');
});

test('this.thread.y float', () => {
  assert.equal(run('const value = this.thread.y'), 'float user_value=float(threadId.y);');
});

test('this.thread.z float', () => {
  assert.equal(run('const value = this.thread.z'), 'float user_value=float(threadId.z);');
});

test('this.output.x float', () => {
  assert.equal(run('const value = this.output.x'), 'float user_value=1.0;');
});

test('this.output.y float', () => {
  assert.equal(run('const value = this.output.y'), 'float user_value=2.0;');
});

test('this.output.z float', () => {
  assert.equal(run('const value = this.output.z'), 'float user_value=3.0;');
});

test('this.outputs.z throws', () => {
  assert.throws(() => {
    run('const value = this.outputs.z');
  });
});

test('Math.E Number float', () => {
  assert.equal(run('const value = Math.E'), `float user_value=${Math.E.toString()};`);
});

test('Math.E Number float', () => {
  assert.equal(run('const value = Math.E'), `float user_value=${Math.E.toString()};`);
});
