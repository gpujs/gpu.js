const { assert, test, module: describe, only } = require('qunit');
const { WebGLFunctionNode } = require(process.cwd() + '/src');

describe('WebGLFunctionNode.contexts');

test('safe from literal 1', () => {
  const node = new WebGLFunctionNode(`function kernel() {
    const const1 = 1;
    const const2 = const1 + 2;
    const const3 = const2 + 3;
    let sum = 0;
    for (let i = 0; i < const3; i++) {
      sum += const3;
    }
  }`, { output: [1] });

  node.toString();
  const { const1, const2, const3 } = node.contexts[1];
  assert.equal(const1.isSafe, true);
  assert.deepEqual(const1.dependencies, [
    {
      origin: 'literal',
      value: 1,
      isSafe: true,
    }
  ]);
  assert.equal(const2.isSafe, true);
  assert.deepEqual(const2.dependencies, [
    {
      name: 'const1',
      origin: 'declaration',
      isSafe: true
    },{
      origin: 'literal',
      value: 2,
      isSafe: true,
    }
  ]);
  assert.equal(const3.isSafe, true);
  assert.deepEqual(const3.dependencies, [
    {
      name: 'const2',
      origin: 'declaration',
      isSafe: true
    },{
      origin: 'literal',
      value: 3,
      isSafe: true,
    }
  ]);
});


test('safe from argument', () => {
  const node = new WebGLFunctionNode(`function kernel(arg1) {
    const const1 = arg1 + 3;
    const const2 = const1 + 2;
    const const3 = const2 + 1;
    let sum = 0;
    for (let i = 0; i < const3; i++) {
      sum += const3;
    }
  }`, { output: [1], argumentTypes: ['Number'] });

  node.toString();
  const { const1, const2, const3 } = node.contexts[1];
  assert.equal(const1.isSafe, false);
  assert.deepEqual(const1.dependencies, [
    {
      name: 'arg1',
      origin: 'argument',
      isSafe: false
    },{
      origin: 'literal',
      value: 3,
      isSafe: true,
    }
  ]);
  assert.equal(const2.isSafe, false);
  assert.deepEqual(const2.dependencies, [
    {
      name: 'const1',
      origin: 'declaration',
      isSafe: false
    },{
      origin: 'literal',
      value: 2,
      isSafe: true,
    }
  ]);
  assert.equal(const3.isSafe, false);
  assert.deepEqual(const3.dependencies, [
    {
      name: 'const2',
      origin: 'declaration',
      isSafe: false
    },{
      origin: 'literal',
      value: 1,
      isSafe: true,
    }
  ]);
});


test('safe from multiplication', () => {
  const node = new WebGLFunctionNode(`function kernel() {
    const const1 = 555;
    const const2 = const1 + .555;
    const const3 = const2 * .1;
    let sum = 0;
    for (let i = 0; i < const3; i++) {
      sum += const3;
    }
  }`, { output: [1] });

  node.toString();
  const { const1, const2, const3 } = node.contexts[1];
  assert.deepEqual(const1.dependencies, [
    {
      origin: 'literal',
      value: 555,
      isSafe: true,
    }
  ]);
  assert.deepEqual(const2.dependencies, [
    {
      name: 'const1',
      origin: 'declaration',
      isSafe: true,
    },{
      origin: 'literal',
      value: .555,
      isSafe: true,
    }
  ]);
  assert.deepEqual(const3.dependencies, [
    {
      name: 'const2',
      origin: 'declaration',
      isSafe: false,
    },{
      origin: 'literal',
      value: .1,
      isSafe: false,
    }
  ]);
});


test('safe from multiplication deep', () => {
  const node = new WebGLFunctionNode(`function kernel() {
    const const1 = 555 * 1;
    const const2 = const1 + .555;
    const const3 = .1 - const2;
    const const4 = const3 - .1;
    const const5 = .1 - const4; 
    const const6 = const5 - .1;
    const const7 = .1 - const6;
    const const8 = const7 - .1;
    const const9 = .1 - const8;
    const const10 = const9 + 10;
    let sum = 0;
    for (let i = 0; i < const3; i++) {
      sum += const3;
    }
  }`, { output: [1] });

  node.toString();
  const { const1, const10 } = node.contexts[1];
  assert.ok(const1.dependencies.every(dependency => dependency.isSafe === false));
  assert.deepEqual(const10.dependencies, [
    {
      name: 'const9',
      origin: 'declaration',
      isSafe: false,
    },{
      origin: 'literal',
      value: 10,
      isSafe: true,
    }
  ]);
});


test('safe from division', () => {
  const node = new WebGLFunctionNode(`function kernel() {
    const const1 = 555;
    const const2 = const1 + .555;
    const const3 = const2 / .1;
    let sum = 0;
    for (let i = 0; i < const3; i++) {
      sum += const3;
    }
  }`, { output: [1] });

  node.toString();
  const { const1, const2, const3 } = node.contexts[1];
  assert.deepEqual(const1.dependencies, [
    {
      origin: 'literal',
      value: 555,
      isSafe: true,
    }
  ]);
  assert.deepEqual(const2.dependencies, [
    {
      name: 'const1',
      origin: 'declaration',
      isSafe: true,
    },{
      origin: 'literal',
      value: .555,
      isSafe: true,
    }
  ]);
  assert.deepEqual(const3.dependencies, [
    {
      name: 'const2',
      origin: 'declaration',
      isSafe: false,
    },{
      origin: 'literal',
      value: .1,
      isSafe: false,
    }
  ]);
});


test('safe from division deep', () => {
  const node = new WebGLFunctionNode(`function kernel() {
    const const1 = 555 / 1;
    const const2 = const1 + .555;
    const const3 = .1 - const2;
    const const4 = .1 - const3; 
    const const5 = const4 - .1;
    const const6 = const5 - .1;
    const const7 = .1 - const6;
    const const8 = const7 - .1;
    const const9 = .1 - const8;
    const const10 = const9 + 10;
    let sum = 0;
    for (let i = 0; i < const3; i++) {
      sum += const3;
    }
  }`, { output: [1] });

  node.toString();
  const { const1, const10 } = node.contexts[1];
  assert.ok(const1.dependencies.every(dependency => dependency.isSafe === false));
  assert.deepEqual(const10.dependencies, [
    {
      name: 'const9',
      origin: 'declaration',
      isSafe: false,
    },{
      origin: 'literal',
      value: 10,
      isSafe: true,
    }
  ]);
});
