const acorn = require('acorn');
const { assert, test, module: describe } = require('qunit');
const { WebGLFunctionNode } = require(process.cwd() + '/src');

describe('WebGLFunctionNode.astMemberExpression()');

function run(value, name, type) {
  const expression = acorn.parse(value).body[0].expression;
  const instance = {
    isState: () => false,
    astMemberExpressionUnroll: () => name,
    declarations: {
      [name]: type
    },
    astGetFirstAvailableName: () => name,
    getVariableType: () => type,
    astGeneric: () => {},
    pushState: () => {},
    popState: () => {},
    isAstVariable: WebGLFunctionNode.prototype.isAstVariable,
    getVariableSignature: WebGLFunctionNode.prototype.getVariableSignature,
    getMemberExpressionPropertyMarkup: WebGLFunctionNode.prototype.getMemberExpressionPropertyMarkup,
  };
  return WebGLFunctionNode.prototype.astMemberExpression.call(instance, expression, []).join('');
}

// test('it[]', () => {
// console.log(run('it[0];', 'it', 'Array'));
// console.log(run('it[0][1];', 'it', 'Array'));
// console.log(run('it[0][1][2];', 'it', 'Array'));
// console.log(run('it[this.thread.x + 100];', 'it', 'Array'));
// });
