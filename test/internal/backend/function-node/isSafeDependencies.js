const { assert, test, module: describe, only } = require('qunit');
const { FunctionNode } = require(process.cwd() + '/src');

describe('FunctionNode.isSafeDependencies()');

test('calls if dependencies are falsey, returns true', () => {
  assert.equal(FunctionNode.prototype.isSafeDependencies(null), true);
});

test('calls if dependencies have all isSafe that are true, returns true', () => {
  assert.equal(FunctionNode.prototype.isSafeDependencies([
    {
      isSafe: true
    },
    {
      isSafe: true
    },
    {
      isSafe: true
    }
  ]), true);
});

test('calls if dependencies have any isSafe that are false, returns false', () => {
  assert.equal(FunctionNode.prototype.isSafeDependencies([
    {
      isSafe: true
    },
    {
      isSafe: false
    },
    {
      isSafe: true
    }
  ]), false);
});
