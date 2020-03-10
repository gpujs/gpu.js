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
    triggerImplyArgumentBitRatio: () => {},
    assignArgumentType: () => {}
  });
  assert.equal(node.toString(), 'float kernel(sampler2D user_v,ivec2 user_vSize,ivec3 user_vDim) {'
    + '\nreturn childFunction(user_v,user_vSize,user_vDim);'
    + '\n}');
  assert.equal(lookupReturnTypeCalls, 2);
  assert.equal(lookupFunctionArgumentTypes, 1);
});
test('handles argument of type HTMLImageArray', () => {
  let lookupReturnTypeCalls = 0;
  let lookupFunctionArgumentTypes = 0;
  const node = new WebGLFunctionNode('function kernel(v) {'
    + '\n return childFunction(v);'
    + '\n}', {
    output: [1],
    argumentTypes: ['HTMLImageArray'],
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
        return ['HTMLImageArray'];
      }
      throw new Error(`unhanded lookupFunctionArgumentTypes for ${functionName}`);
    },
    triggerImplyArgumentBitRatio: () => {},
    assignArgumentType: () => {}
  });
  assert.equal(node.toString(), 'float kernel(sampler2DArray user_v,ivec2 user_vSize,ivec3 user_vDim) {'
    + '\nreturn childFunction(user_v,user_vSize,user_vDim);'
    + '\n}');
  assert.equal(lookupReturnTypeCalls, 2);
  assert.equal(lookupFunctionArgumentTypes, 1);
});
test('handles argument types of CallExpression that return arrays', () => {
  const node = new WebGLFunctionNode(`function kernel() {
    const p = [this.thread.x, this.thread.y];
    const z = array2(array2(p, 0.01), 0.02);
    return 1.0;
  }`, {
    output: [1, 1],
    lookupReturnType: () => 'Number',
    needsArgumentType: () => false,
    lookupFunctionArgumentTypes: () => [],
    triggerImplyArgumentType: () => {}
  });
  assert.equal(node.toString(), `float kernel() {
vec2 user_p=vec2(threadId.x, threadId.y);
float user_z=array2(array2(user_p, 0.01), 0.02);
return 1.0;
}`);
});
