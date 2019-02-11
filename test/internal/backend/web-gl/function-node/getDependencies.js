const { assert, test, module: describe, only } = require('qunit');
const { WebGLFunctionNode } = require(process.cwd() + '/src');

describe('WebGLFunctionNode.getDependencies()');

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
  assert.equal(node.declarations.const1.isSafe, true);
  assert.deepEqual(node.declarations.const1.dependencies, [
    {
      origin: 'literal',
      value: 1,
      isSafe: true,
    }
  ]);
  assert.equal(node.declarations.const2.isSafe, true);
  assert.deepEqual(node.declarations.const2.dependencies, [
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
  assert.equal(node.declarations.const3.isSafe, true);
  assert.deepEqual(node.declarations.const3.dependencies, [
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
  assert.equal(node.declarations.const1.isSafe, false);
  assert.deepEqual(node.declarations.const1.dependencies, [
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
  assert.equal(node.declarations.const1.isSafe, false);
  assert.deepEqual(node.declarations.const2.dependencies, [
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
  assert.equal(node.declarations.const1.isSafe, false);
  assert.deepEqual(node.declarations.const3.dependencies, [
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
  assert.deepEqual(node.declarations.const1.dependencies, [
    {
      origin: 'literal',
      value: 555,
      isSafe: true,
    }
  ]);
  assert.deepEqual(node.declarations.const2.dependencies, [
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
  assert.deepEqual(node.declarations.const3.dependencies, [
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
    const const5 = const3 - .1;
    const const4 = .1 - const4; 
    const const7 = const5 - .1;
    const const6 = .1 - const6;
    const const8 = const7 - .1;
    const const9 = .1 - const8;
    const const10 = const9 + 10;
    let sum = 0;
    for (let i = 0; i < const3; i++) {
      sum += const3;
    }
  }`, { output: [1] });

  node.toString();
  assert.ok(node.declarations.const1.dependencies.every(dependency => dependency.isSafe === false));
  assert.deepEqual(node.declarations.const10.dependencies, [
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
  assert.deepEqual(node.declarations.const1.dependencies, [
    {
      origin: 'literal',
      value: 555,
      isSafe: true,
    }
  ]);
  assert.deepEqual(node.declarations.const2.dependencies, [
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
  assert.deepEqual(node.declarations.const3.dependencies, [
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
    const const5 = const3 - .1;
    const const4 = .1 - const4; 
    const const7 = const5 - .1;
    const const6 = .1 - const6;
    const const8 = const7 - .1;
    const const9 = .1 - const8;
    const const10 = const9 + 10;
    let sum = 0;
    for (let i = 0; i < const3; i++) {
      sum += const3;
    }
  }`, { output: [1] });

  node.toString();
  assert.ok(node.declarations.const1.dependencies.every(dependency => dependency.isSafe === false));
  assert.deepEqual(node.declarations.const10.dependencies, [
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
