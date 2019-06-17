const { assert, test, module: describe, only } = require('qunit');
const { WebGLFunctionNode } = require(process.cwd() + '/src');

describe('WebGLFunctionNode.getVariableSignature()');

function run(value) {
  const mockInstance = {
    source: `function() { ${value}; }`,
    traceFunctionAST: () => {}
  };
  const ast = WebGLFunctionNode.prototype.getJsAST.call(mockInstance);
  const expression = ast.body.body[0].expression;
  return WebGLFunctionNode.prototype.getVariableSignature.call({
    isAstVariable: WebGLFunctionNode.prototype.isAstVariable
  }, expression);
}

test('value', () => {
  assert.equal(run('value'), 'value');
});
test('value[number]', () => {
  assert.equal(run('value[0]'), 'value[]');
});
test('value[variable]', () => {
  assert.equal(run('value[a]'), 'value[]');
});
test('value[variable] with conflicting names x', () => {
  assert.equal(run('value[x]'), 'value[]');
});
test('value[variable] with conflicting names y', () => {
  assert.equal(run('value[y]'), 'value[]');
});
test('value[variable] with conflicting names z', () => {
  assert.equal(run('value[z]'), 'value[]');
});
test('value[this.thread.x]', () => {
  assert.equal(run('value[this.thread.x]'), 'value[]');
});
test('value[this.thread.x][variable]', () => {
  assert.equal(run('value[this.thread.x][a]'), 'value[][]');
});
test('value[variable] with conflicting names constants', () => {
  assert.equal(run('value[constants]'), 'value[]');
});
test('value[variable] with conflicting names constants', () => {
  assert.equal(run('value[output]'), 'value[]');
});
test('value[variable] with conflicting names thread', () => {
  assert.equal(run('value[thread]'), 'value[]');
});
test('value[number][number]', () => {
  assert.equal(run('value[0][0]'), 'value[][]');
});
test('value[variable][variable]', () => {
  assert.equal(run('value[a][b]'), 'value[][]');
});
test('value[number][number][number]', () => {
  assert.equal(run('value[0][0][0]'), 'value[][][]');
});
test('value[variable][variable][variable]', () => {
  assert.equal(run('value[a][b][c]'), 'value[][][]');
});

test('this.thread.value', () => {
  assert.equal(run('this.thread.x'), 'this.thread.value');
  assert.equal(run('this.thread.y'), 'this.thread.value');
  assert.equal(run('this.thread.z'), 'this.thread.value');
});

test('this.output.value', () => {
  assert.equal(run('this.output.x'), 'this.output.value');
  assert.equal(run('this.output.y'), 'this.output.value');
  assert.equal(run('this.output.z'), 'this.output.value');
});

test('this.constants.value', () => {
  assert.equal(run('this.constants.value'), 'this.constants.value');
});
test('this.constants.value[]', () => {
  assert.equal(run('this.constants.value[0]'), 'this.constants.value[]');
});
test('this.constants.value[][]', () => {
  assert.equal(run('this.constants.value[0][0]'), 'this.constants.value[][]');
});
test('this.constants.value[][][]', () => {
  assert.equal(run('this.constants.value[0][0][0]'), 'this.constants.value[][][]');
});
test('this.constants.texture[this.thread.z][this.thread.y][this.thread.x]', () => {
  assert.equal(run('this.constants.texture[this.thread.z][this.thread.y][this.thread.x]'), 'this.constants.value[][][]');
});
test('this.whatever.value', () => {
  assert.equal(run('this.whatever.value'), null);
});
test('this.constants.value[][][][]', () => {
  assert.equal(run('this.constants.value[0][0][0][0]'), 'this.constants.value[][][][]');
});
test('this.constants.value.something', () => {
  assert.equal(run('this.constants.value.something'), null);
});
test('this.constants.value[].something', () => {
  assert.equal(run('this.constants.value[0].something'), null);
});
test('this.constants.value[][].something', () => {
  assert.equal(run('this.constants.value[0][0].something'), null);
});
test('this.constants.value[][][][]', () => {
  assert.equal(run('this.constants.value[0][0][0].something'), null);
});
test('complex nested this.constants.value[][][]', () => {
  assert.equal(run(`
  this.constants.value[
    this.constants.value[i + 1]
  ]
  [
    Math.random() * 1 + this.thread.x
  ]
  [
    this.thread.x - 100
  ]
`), 'this.constants.value[][][]');
});
test('complex nested with function call this.constants.value[][][]', () => {
  assert.equal(run(`
  this.constants.value[
    something()
  ]
  [
    Math.random() * 1 + this.thread.x
  ]
  [
    this.thread.x - 100
  ]
`), 'this.constants.value[][][]')
});
test('non-existent something', () => {
  assert.equal(run('this.constants.value[0][0].something'), null);
});
test('non-existent constants', () => {
  assert.equal(run('this.constants.value[0][0].constants'), null);
});
test('function call', () => {
  assert.throws(() => {
    run('Math.random()');
  });
});
test('binary expression add', () => {
  assert.throws(() => {
    run('value[0] + value[0]');
  });
});
test('binary expression divide', () => {
  assert.throws(() => {
    run('value[0] / value[0]');
  });
});
