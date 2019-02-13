const { assert, test, module: describe, only } = require('qunit');
const { FunctionNode } = require(process.cwd() + '/src');

describe('FunctionNode.isSafe()');

test('calls this.getDependencies(ast) and then this.isSafeDependencies()', () => {
  const mockAst = {};
  const dependenciesMock = {
    dependencies: []
  };
  let calls = 0;
  FunctionNode.prototype.isSafe.call({
    getDependencies: (ast) => {
      assert.equal(ast, mockAst);
      assert.equal(calls++, 0);
      return dependenciesMock;
    },
    isSafeDependencies: (dependencies) => {
      assert.equal(calls++, 1);
      assert.equal(dependencies, dependenciesMock);
    }
  }, mockAst);

  assert.equal(calls, 2);
});
