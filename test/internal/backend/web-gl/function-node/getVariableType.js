const { assert, test, module: describe, only } = require('qunit');
const { WebGLFunctionNode, GLKernel } = require(process.cwd() + '/src');

describe('WebGLFunctionNode.getVariableType()');

test('Native function > detects same native argument type float, and no cast', () => {
  const nativeFunction = `float nativeFunction(float value) { return value + 1.0; }`;
  const returnType = GLKernel.nativeFunctionReturnType(nativeFunction);
  const { argumentTypes } = GLKernel.nativeFunctionArguments(nativeFunction);
  const node = new WebGLFunctionNode(`function kernel(value) {
    return nativeFunction(value);
  }`, {
    output: [1],
    argumentTypes: ['Number'],
    lookupReturnType: (name, ast, node) => {
      if (name === 'nativeFunction') return returnType;
      throw new Error('unknown function');
    },
    lookupFunctionArgumentTypes: (functionName) => {
      if (functionName === 'nativeFunction') return argumentTypes;
      throw new Error('unknown function');
    },
    needsArgumentType: () => false
  });

  assert.equal(node.toString(), 'float kernel(float user_value) {'
    + '\nreturn nativeFunction(user_value);'
    + '\n}');
});

test('Native function > detects same native argument type int, and no cast', () => {
  const nativeFunction = `float nativeFunction(int value) { return float(value + 1); }`;
  const returnType = GLKernel.nativeFunctionReturnType(nativeFunction);
  const { argumentTypes } = GLKernel.nativeFunctionArguments(nativeFunction);
  const node = new WebGLFunctionNode(`function kernel(value) {
    return nativeFunction(value);
  }`, {
    output: [1],
    argumentTypes: ['Integer'],
    lookupReturnType: (name, ast, node) => {
      if (name === 'nativeFunction') return returnType;
      throw new Error('unknown function');
    },
    lookupFunctionArgumentTypes: (functionName) => {
      if (functionName === 'nativeFunction') return argumentTypes;
      throw new Error('unknown function');
    },
    needsArgumentType: () => false
  });

  assert.equal(node.toString(), 'float kernel(int user_value) {'
    + '\nreturn nativeFunction(user_value);'
    + '\n}');
});

test('Native function > detects different native argument type int from literal, and cast to it from float', () => {
  const nativeFunction = `float nativeFunction(int value) { return float(value + 1); }`;
  const returnType = GLKernel.nativeFunctionReturnType(nativeFunction);
  const { argumentTypes } = GLKernel.nativeFunctionArguments(nativeFunction);
  const node = new WebGLFunctionNode(`function kernel(value) {
    return nativeFunction(1.5);
  }`, {
    output: [1],
    argumentTypes: ['Number'],
    lookupReturnType: (name, ast, node) => {
      if (name === 'nativeFunction') return returnType;
      throw new Error('unknown function');
    },
    lookupFunctionArgumentTypes: (functionName) => {
      if (functionName === 'nativeFunction') return argumentTypes;
      throw new Error('unknown function');
    },
    needsArgumentType: () => false
  });

  assert.equal(node.toString(), 'float kernel(float user_value) {'
    + '\nreturn nativeFunction(int(1.5));'
    + '\n}');
});

test('Native function > detects different native argument type float from literal, and cast to it from int', () => {
  const nativeFunction = `float nativeFunction(int value) { return float(value + 1); }`;
  const returnType = GLKernel.nativeFunctionReturnType(nativeFunction);
  const { argumentTypes } = GLKernel.nativeFunctionArguments(nativeFunction);
  const node = new WebGLFunctionNode(`function kernel(value) {
    return nativeFunction(1);
  }`, {
    output: [1],
    argumentTypes: ['Number'],
    lookupReturnType: (name, ast, node) => {
      if (name === 'nativeFunction') return returnType;
      throw new Error('unknown function');
    },
    lookupFunctionArgumentTypes: (functionName) => {
      if (functionName === 'nativeFunction') return argumentTypes;
      throw new Error('unknown function');
    },
    needsArgumentType: () => false
  });

  assert.equal(node.toString(), 'float kernel(float user_value) {'
    + '\nreturn nativeFunction(1);'
    + '\n}');
});

test('Native function > detects different native argument type int, and cast to it from float', () => {
  const nativeFunction = `float nativeFunction(int value) { return float(value + 1); }`;
  const returnType = GLKernel.nativeFunctionReturnType(nativeFunction);
  const { argumentTypes } = GLKernel.nativeFunctionArguments(nativeFunction);
  const node = new WebGLFunctionNode(`function kernel(value) {
    return nativeFunction(value);
  }`, {
    output: [1],
    argumentTypes: ['Number'],
    lookupReturnType: (name, ast, node) => {
      if (name === 'nativeFunction') return returnType;
      throw new Error('unknown function');
    },
    lookupFunctionArgumentTypes: (functionName) => {
      if (functionName === 'nativeFunction') return argumentTypes;
      throw new Error('unknown function');
    },
    needsArgumentType: () => false
  });

  assert.equal(node.toString(), 'float kernel(float user_value) {'
    + '\nreturn nativeFunction(int(user_value));'
    + '\n}');
});

test('Native function > detects different native argument type float, and cast to it from int', () => {
  const nativeFunction = `float nativeFunction(float value) { return value + 1.0; }`;
  const returnType = GLKernel.nativeFunctionReturnType(nativeFunction);
  const { argumentTypes } = GLKernel.nativeFunctionArguments(nativeFunction);
  const node = new WebGLFunctionNode(`function kernel(value) {
    return nativeFunction(value);
  }`, {
    output: [1],
    argumentTypes: ['Integer'],
    lookupReturnType: (name, ast, node) => {
      if (name === 'nativeFunction') return returnType;
      throw new Error('unknown function');
    },
    lookupFunctionArgumentTypes: (functionName) => {
      if (functionName === 'nativeFunction') return argumentTypes;
      throw new Error('unknown function');
    },
    needsArgumentType: () => false
  });

  assert.equal(node.toString(), 'float kernel(int user_value) {'
    + '\nreturn nativeFunction(float(user_value));'
    + '\n}');
});
