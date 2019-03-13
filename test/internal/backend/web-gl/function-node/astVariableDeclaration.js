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

test('Array2 value[] from value[]', () => {
  assert.equal(run('const value = [arg1[0], arg2[0]];', {
    argumentNames: ['arg1', 'arg2'],
    argumentTypes: ['Array', 'Array']
  }), 'vec2 user_value=vec2('
    + 'get(user_arg1, user_arg1Size, user_arg1Dim, user_arg1BitRatio, 0, 0, 0), '
    + 'get(user_arg2, user_arg2Size, user_arg2Dim, user_arg2BitRatio, 0, 0, 0)'
    + ');');
});

test('Array3 value[] from value[]', () => {
  assert.equal(run('const value = [arg1[0], arg2[0], arg3[0]];', {
    argumentNames: ['arg1', 'arg2', 'arg3'],
    argumentTypes: ['Array', 'Array', 'Array']
  }), 'vec3 user_value=vec3('
    + 'get(user_arg1, user_arg1Size, user_arg1Dim, user_arg1BitRatio, 0, 0, 0), '
    + 'get(user_arg2, user_arg2Size, user_arg2Dim, user_arg2BitRatio, 0, 0, 0), '
    + 'get(user_arg3, user_arg3Size, user_arg3Dim, user_arg3BitRatio, 0, 0, 0)'
    + ');');
});

test('Array4 value[] from value[]', () => {
  assert.equal(run('const value = [arg1[0], arg2[0], arg3[0], arg4[0]];', {
    argumentNames: ['arg1', 'arg2', 'arg3', 'arg4'],
    argumentTypes: ['Array', 'Array', 'Array', 'Array']
  }), 'vec4 user_value=vec4('
    + 'get(user_arg1, user_arg1Size, user_arg1Dim, user_arg1BitRatio, 0, 0, 0), '
    + 'get(user_arg2, user_arg2Size, user_arg2Dim, user_arg2BitRatio, 0, 0, 0), '
    + 'get(user_arg3, user_arg3Size, user_arg3Dim, user_arg3BitRatio, 0, 0, 0), '
    + 'get(user_arg4, user_arg4Size, user_arg4Dim, user_arg4BitRatio, 0, 0, 0)'
    + ');');
});

test('float, Array2, Array3 chain values', () => {
  assert.equal(run('const value1 = 1, '
    + 'value2 = [arg1[0], arg2[0]], '
    + 'value3 = [arg1[0], arg2[0], arg3[0]], '
    + 'value4 = [arg1[0], arg2[0], arg3[0], arg4[0]];', {
    argumentNames: ['arg1', 'arg2', 'arg3', 'arg4'],
    argumentTypes: ['Array', 'Array', 'Array', 'Array']
  }), 'float user_value1=1.0;'
    + 'vec2 user_value2=vec2('
    + 'get(user_arg1, user_arg1Size, user_arg1Dim, user_arg1BitRatio, 0, 0, 0), '
    + 'get(user_arg2, user_arg2Size, user_arg2Dim, user_arg2BitRatio, 0, 0, 0)'
    + ');'
    + 'vec3 user_value3=vec3('
    + 'get(user_arg1, user_arg1Size, user_arg1Dim, user_arg1BitRatio, 0, 0, 0), '
    + 'get(user_arg2, user_arg2Size, user_arg2Dim, user_arg2BitRatio, 0, 0, 0), '
    + 'get(user_arg3, user_arg3Size, user_arg3Dim, user_arg3BitRatio, 0, 0, 0)'
    + ');'
    + 'vec4 user_value4=vec4('
    + 'get(user_arg1, user_arg1Size, user_arg1Dim, user_arg1BitRatio, 0, 0, 0), '
    + 'get(user_arg2, user_arg2Size, user_arg2Dim, user_arg2BitRatio, 0, 0, 0), '
    + 'get(user_arg3, user_arg3Size, user_arg3Dim, user_arg3BitRatio, 0, 0, 0), '
    + 'get(user_arg4, user_arg4Size, user_arg4Dim, user_arg4BitRatio, 0, 0, 0)'
    + ');');
});

test('float, Array2, Array3, Array4 multiple values', () => {
  assert.equal(run('const value1 = 1, '
    + 'value2 = [arg1[0], arg2[0]], '
    + 'value3 = [arg1[0], arg2[0], arg3[0]], '
    + 'value4 = [arg1[0], arg2[0], arg3[0], arg4[0]];', {
    argumentNames: ['arg1', 'arg2', 'arg3', 'arg4'],
    argumentTypes: ['Array', 'Array', 'Array', 'Array']
  }), 'float user_value1=1.0;'
    + 'vec2 user_value2=vec2('
    + 'get(user_arg1, user_arg1Size, user_arg1Dim, user_arg1BitRatio, 0, 0, 0), '
    + 'get(user_arg2, user_arg2Size, user_arg2Dim, user_arg2BitRatio, 0, 0, 0)'
    + ');'
    + 'vec3 user_value3=vec3('
    + 'get(user_arg1, user_arg1Size, user_arg1Dim, user_arg1BitRatio, 0, 0, 0), '
    + 'get(user_arg2, user_arg2Size, user_arg2Dim, user_arg2BitRatio, 0, 0, 0), '
    + 'get(user_arg3, user_arg3Size, user_arg3Dim, user_arg3BitRatio, 0, 0, 0)'
    + ');'
    + 'vec4 user_value4=vec4('
    + 'get(user_arg1, user_arg1Size, user_arg1Dim, user_arg1BitRatio, 0, 0, 0), '
    + 'get(user_arg2, user_arg2Size, user_arg2Dim, user_arg2BitRatio, 0, 0, 0), '
    + 'get(user_arg3, user_arg3Size, user_arg3Dim, user_arg3BitRatio, 0, 0, 0), '
    + 'get(user_arg4, user_arg4Size, user_arg4Dim, user_arg4BitRatio, 0, 0, 0)'
    + ');');
});

test('float, float, Array4, Array4, Array4 chain values', () => {
  assert.equal(run('const value1 = 1, value2 = 1.5, '
    + 'value3 = [arg1[0], arg2[0], arg3[0], arg4[0]], '
    + 'value4 = [arg4[4], arg3[4], arg2[4], arg1[4]], '
    + 'value5 = [arg2[1], arg2[2], arg2[3], arg2[4]];', {
    argumentNames: ['arg1', 'arg2', 'arg3', 'arg4'],
    argumentTypes: ['Array', 'Array', 'Array', 'Array']
  }), 'float user_value1=1.0,user_value2=1.5;'
    + 'vec4 user_value3=vec4('
    + 'get(user_arg1, user_arg1Size, user_arg1Dim, user_arg1BitRatio, 0, 0, 0), '
    + 'get(user_arg2, user_arg2Size, user_arg2Dim, user_arg2BitRatio, 0, 0, 0), '
    + 'get(user_arg3, user_arg3Size, user_arg3Dim, user_arg3BitRatio, 0, 0, 0), '
    + 'get(user_arg4, user_arg4Size, user_arg4Dim, user_arg4BitRatio, 0, 0, 0)'
    + '),'
    + 'user_value4=vec4('
    + 'get(user_arg4, user_arg4Size, user_arg4Dim, user_arg4BitRatio, 0, 0, 4), '
    + 'get(user_arg3, user_arg3Size, user_arg3Dim, user_arg3BitRatio, 0, 0, 4), '
    + 'get(user_arg2, user_arg2Size, user_arg2Dim, user_arg2BitRatio, 0, 0, 4), '
    + 'get(user_arg1, user_arg1Size, user_arg1Dim, user_arg1BitRatio, 0, 0, 4)'
    + '),'
    + 'user_value5=vec4('
    + 'get(user_arg2, user_arg2Size, user_arg2Dim, user_arg2BitRatio, 0, 0, 1), '
    + 'get(user_arg2, user_arg2Size, user_arg2Dim, user_arg2BitRatio, 0, 0, 2), '
    + 'get(user_arg2, user_arg2Size, user_arg2Dim, user_arg2BitRatio, 0, 0, 3), '
    + 'get(user_arg2, user_arg2Size, user_arg2Dim, user_arg2BitRatio, 0, 0, 4)'
    + ');');
});

test('float literal, float literal, multiple values', () => {
  assert.equal(run('const value1 = 0, '
    + 'value2 = 0;', {
    argumentNames: [],
    argumentTypes: []
  }), 'float user_value1=0.0,user_value2=0.0;');
});

test('float literal, float literal, multiple values', () => {
  assert.equal(run('const value1 = 0, '
    + 'value2 = 0;', {
    argumentNames: [],
    argumentTypes: []
  }), 'float user_value1=0.0,user_value2=0.0;');
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
