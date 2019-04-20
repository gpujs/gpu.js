const { assert, test, module: describe, only } = require('qunit');
const { WebGLFunctionNode } = require(process.cwd() + '/src');

describe('WebGLFunctionNode.getType()');

function run(value, settings) {
  const node = new WebGLFunctionNode(`function fn(value, value2, value3) {
    ${ value };
  }`, Object.assign({ output: [1] }, settings));

  const ast = node.getJsAST();
  assert.equal(ast.type, 'FunctionExpression');
  assert.equal(ast.body.type, 'BlockStatement');
  assert.equal(ast.body.body[0].type, 'ExpressionStatement');

  return node.getType(ast.body.body[0].expression);
}

test('literal 0', () => {
  assert.equal(run('0'), 'LiteralInteger');
});

test('literal 0.1', () => {
  assert.equal(run('0.1'), 'Number');
});

test('unknown value from arguments', () => {
  assert.equal(run('value'), null);
});

test('value Number from arguments', () => {
  assert.equal(run('value', {
    argumentNames: ['value'],
    argumentTypes: ['Fake Type']
  }), 'Fake Type');
});

test('value[] Number from arguments', () => {
  assert.equal(run('value[0]', {
    argumentNames: ['value'],
    argumentTypes: ['Array']
  }), 'Number');
});

test('value[][] Number from arguments', () => {
  assert.equal(run('value[0][0]', {
    argumentNames: ['value'],
    argumentTypes: ['Array']
  }), 'Number');
});

test('value[][][] Number from arguments', () => {
  assert.equal(run('value[0][0][0]', {
    argumentNames: ['value'],
    argumentTypes: ['Array']
  }), 'Number');
});

test('this.constants.value Integer', () => {
  assert.equal(run('this.constants.value', {
    constants: { value: 1 },
    constantTypes: { value: 'Integer' }
  }), 'Integer');
});

test('this.constants.value[] Number', () => {
  assert.equal(run('this.constants.value[0]', {
    constants: { value: [1] },
    constantTypes: { value: 'Array' }
  }), 'Number');
});

test('this.constants.value[][] Number', () => {
  assert.equal(run('this.constants.value[0][0]', {
    constants: { value: [[1]] },
    constantTypes: { value: 'Array' }
  }), 'Number');
});

test('this.constants.value[][][] Number', () => {
  assert.equal(run('this.constants.value[0][0][0]', {
    constants: { value: [[[1]]] },
    constantTypes: { value: 'Array' }
  }), 'Number');
});

test('this.thread.x', () => {
  assert.equal(run('this.thread.x'), 'Integer');
});

test('this.thread.y', () => {
  assert.equal(run('this.thread.y'), 'Integer');
});

test('this.thread.z', () => {
  assert.equal(run('this.thread.z'), 'Integer');
});

test('this.output.x', () => {
  assert.equal(run('this.output.x'), 'LiteralInteger');
});

test('this.output.y', () => {
  assert.equal(run('this.output.y'), 'LiteralInteger');
});

test('this.output.y', () => {
  assert.equal(run('this.output.y'), 'LiteralInteger');
});

test('bogus this.outputs.y', () => {
  assert.throws(() => {
    run('this.outputs.y');
  });
});

test('bogus this.threads.y', () => {
  assert.throws(() => {
    run('this.threads.y');
  });
});

test('unknown function call', () => {
  assert.throws(() => {
    assert.equal(run('value()'), null);
  });
});

test('function call', () => {
  assert.equal(run('value()', {
    lookupReturnType: (name, ast, node) => name === 'value' ? 'Fake Type' : null,
  }), 'Fake Type');
});

test('simple unknown expression', () => {
  assert.equal(run('value + value2'), null);
});

test('simple expression', () => {
  assert.equal(run('value + otherValue', {
    argumentNames: ['value'],
    argumentTypes: ['Number']
  }), 'Number');
});

test('simple right expression', () => {
  assert.equal(run('value + value2', {
    argumentNames: ['value', 'value2'],
    argumentTypes: ['Number', 'Number']
  }), 'Number');
});

test('function call expression', () => {
  assert.equal(run('otherFunction() + value', {
    lookupReturnType: (name, ast, node) => name === 'otherFunction' ? 'Fake Type' : null,
  }), 'Fake Type');
});

test('Math.E', () => {
  assert.equal(run('Math.E'), 'Number');
});

test('Math.PI', () => {
  assert.equal(run('Math.PI'), 'Number');
});

test('Math.SQRT2', () => {
  assert.equal(run('Math.SQRT2'), 'Number');
});

test('Math.SQRT1_2', () => {
  assert.equal(run('Math.SQRT1_2'), 'Number');
});

test('Math.LN2', () => {
  assert.equal(run('Math.LN2'), 'Number');
});

test('Math.LN10', () => {
  assert.equal(run('Math.LN10'), 'Number');
});

test('Math.LOG2E', () => {
  assert.equal(run('Math.LOG2E'), 'Number');
});

test('Math.LOG10E', () => {
  assert.equal(run('Math.LOG10E'), 'Number');
});

test('Math.abs(value)', () => {
  assert.equal(run('Math.abs(value)'), 'Number');
});

test('Math.acos(value)', () => {
  assert.equal(run('Math.acos(value)'), 'Number');
});

test('Math.atan(value)', () => {
  assert.equal(run('Math.atan(value)'), 'Number');
});

test('Math.atan2(value, value2)', () => {
  assert.equal(run('Math.atan2(value, value2)'), 'Number');
});

test('Math.ceil(value)', () => {
  assert.equal(run('Math.ceil(value)'), 'Number');
});

test('Math.cos(value)', () => {
  assert.equal(run('Math.cos(value)'), 'Number');
});

test('Math.exp(value)', () => {
  assert.equal(run('Math.exp(value)'), 'Number');
});

test('Math.floor(value)', () => {
  assert.equal(run('Math.floor(value)'), 'Number');
});

test('Math.log(value)', () => {
  assert.equal(run('Math.log(value)'), 'Number');
});

test('Math.max(value, value2, value3)', () => {
  assert.equal(run('Math.max(value, value2, value3)'), 'Number');
});

test('Math.min(value, value2, value3)', () => {
  assert.equal(run('Math.min(value, value2, value3)'), 'Number');
});

test('Math.pow(value, value2)', () => {
  assert.equal(run('Math.pow(value, value2)'), 'Number');
});

test('Math.random()', () => {
  assert.equal(run('Math.random()'), 'Number');
});

test('Math.round(value)', () => {
  assert.equal(run('Math.random(value)'), 'Number');
});

test('Math.sin(value)', () => {
  assert.equal(run('Math.sin(value)'), 'Number');
});

test('Math.sqrt(value)', () => {
  assert.equal(run('Math.sqrt(value)'), 'Number');
});

test('Math.tan(value)', () => {
  assert.equal(run('Math.tan(value)'), 'Number');
});
