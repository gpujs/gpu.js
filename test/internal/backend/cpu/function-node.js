const { assert, skip, test, module: describe, only } = require('qunit');
const sinon = require('sinon');
const { CPUFunctionNode } = require('../../../../src');

describe('internal: CPUFunctionNode');

test('should call warn when using var is used in source', () => {
  const node = new CPUFunctionNode(`function() { var v = 1; return v; }`, {
    output: [1],
    precision: 'unsigned',
    argumentTypes: [],
    name: 'kernel',
  });
  node.varWarn = sinon.spy();
  node.toString();
  assert.equal(node.varWarn.callCount, 1);
});

test('should not call warn when using var is used in source and warnVarUsage is false', () => {
  const node = new CPUFunctionNode(`function() { var v = 1; return v; }`, {
    output: [1],
    precision: 'unsigned',
    argumentTypes: [],
    name: 'kernel',
    warnVarUsage: false,
  });
  node.varWarn = sinon.spy();
  node.toString();
  assert.equal(node.varWarn.callCount, 0);
});

test('should not call warn when using const or let is used in source', () => {
  const node = new CPUFunctionNode(`function() { const v1 = 1; let v2 = 2; return v1; }`, {
    output: [1],
    precision: 'unsigned',
    argumentTypes: [],
    name: 'kernel',
  });
  node.varWarn = node.varWarn = sinon.spy();
  node.toString();
  assert.equal(node.varWarn.callCount, 0);
});
