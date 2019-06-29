const { assert, test, module: describe, only } = require('qunit');
const { WebGLFunctionNode } = require(process.cwd() + '/src');

describe('WebGLFunctionNode.astCallExpression()');

test('handles Math.abs with floats', () => {
  const node = new WebGLFunctionNode(`function kernel(v) {
    return Math.abs(v);
  }`, { output: [1], argumentTypes: ['Number'] });
  assert.equal(node.toString(), 'float kernel(float user_v) {'
    + '\nreturn abs(user_v);'
    + '\n}');
});
test('handles Math.abs with ints', () => {
  const node = new WebGLFunctionNode(`function kernel(v) {
    return Math.abs(v);
  }`, { output: [1], argumentTypes: ['Integer'] });
  assert.equal(node.toString(), 'float kernel(int user_v) {'
    + '\nreturn abs(float(user_v));'
    + '\n}');
});
test('handles Math.pow with floats', () => {
  const node = new WebGLFunctionNode(`function kernel(v, v2) {
    return Math.pow(v, v2);
  }`, { output: [1], argumentTypes: ['Number', 'Number'] });
  assert.equal(node.toString(), 'float kernel(float user_v, float user_v2) {'
    + '\nreturn pow(user_v, user_v2);'
    + '\n}');
});
test('handles Math.pow with mixed 1', () => {
  const node = new WebGLFunctionNode(`function kernel(v, v2) {
    return Math.pow(v, v2);
  }`, { output: [1], argumentTypes: ['Number', 'Integer'] });
  assert.equal(node.toString(), 'float kernel(float user_v, int user_v2) {'
    + '\nreturn pow(user_v, float(user_v2));'
    + '\n}');
});
test('handles Math.pow with mixed 2', () => {
  const node = new WebGLFunctionNode(`function kernel(v, v2) {
    return Math.pow(v, v2);
  }`, { output: [1], argumentTypes: ['Integer', 'Number'] });
  assert.equal(node.toString(), 'float kernel(int user_v, float user_v2) {'
    + '\nreturn pow(float(user_v), user_v2);'
    + '\n}');
});
test('handles Math.pow with ints', () => {
  const node = new WebGLFunctionNode(`function kernel(v, v2) {
    return Math.pow(v, v2);
  }`, { output: [1], argumentTypes: ['Integer', 'Integer'] });
  assert.equal(node.toString(), 'float kernel(int user_v, int user_v2) {'
    + '\nreturn pow(float(user_v), float(user_v2));'
    + '\n}');
});
test('handles argument of type Input', () => {
  let lookupReturnTypeCalls = 0;
  let lookupFunctionArgumentTypes = 0;
  let triggerTrackArgumentSynonymCalls = 0;
  const node = new WebGLFunctionNode('function kernel(v) {'
    + '\n return childFunction(v);'
    + '\n}', {
    output: [1],
    argumentTypes: ['Input'],
    needsArgumentType: () => false,
    lookupReturnType: (functionName) => {
      lookupReturnTypeCalls++;
      if (functionName === 'childFunction') {
        return 'Number';
      }
      throw new Error(`unhanded lookupReturnType for ${functionName}`);
    },
    lookupFunctionArgumentTypes: (functionName) => {
      lookupFunctionArgumentTypes++;
      if (functionName === 'childFunction') {
        return ['Input'];
      }
      throw new Error(`unhanded lookupFunctionArgumentTypes for ${functionName}`);
    },
    triggerTrackArgumentSynonym: (kernelName, argumentName, functionName, argumentIndex) => {
      triggerTrackArgumentSynonymCalls++;
      if (kernelName === 'kernel' && argumentName === 'v' && functionName === 'childFunction' && argumentIndex === 0) {
        return;
      }
      throw new Error(`unhandled triggerTrackArgumentSynonym`);
    },
    assignArgumentType: () => {}
  });
  assert.equal(node.toString(), 'float kernel(sampler2D user_v) {'
    + '\nreturn childFunction(user_v);'
    + '\n}');
  assert.equal(lookupReturnTypeCalls, 2);
  assert.equal(lookupFunctionArgumentTypes, 1);
  assert.equal(triggerTrackArgumentSynonymCalls, 1);
});
