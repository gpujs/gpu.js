const { assert, test, module: describe, only } = require('qunit');
const { FunctionBuilder, CPUFunctionNode, WebGL2FunctionNode, WebGLFunctionNode } = require('../../src');

describe('internal: function builder');

// Three layer template for multiple tests
function threeLayerTemplate(FunctionNode) {
  function layerOne() {
    return 42;
  }

  function layerTwo() {
    return layerOne() * 2;
  }

  function layerThree() {
    return layerTwo() * 2;
  }

  // Create a function hello node
  return new FunctionBuilder({
    functionNodes: [
      new FunctionNode(layerOne.toString(), {
        output: [1],
        lookupReturnType: () => 'Number',
        lookupFunctionArgumentTypes: () => {}
      }),
      new FunctionNode(layerTwo.toString(), {
        output: [1],
        lookupReturnType: () => 'Number',
        lookupFunctionArgumentTypes: () => {}
      }),
      new FunctionNode(layerThree.toString(), {
        output: [1],
        lookupReturnType: () => 'Number',
        lookupFunctionArgumentTypes: () => {}
      }),
    ],
    output: [1]
  });
}

/// Test the function tracing of 3 layers
test('traceFunctionCalls: 3 layer test cpu', () => {
  const builder = threeLayerTemplate(CPUFunctionNode);
  assert.deepEqual(builder.traceFunctionCalls('layerOne'), ['layerOne']);
  assert.deepEqual(builder.traceFunctionCalls('layerTwo'), ['layerTwo', 'layerOne']);
  assert.deepEqual(builder.traceFunctionCalls('layerThree'), ['layerThree', 'layerTwo', 'layerOne']);
});

test('traceFunctionCalls: 3 layer test webgl', () => {
  const builder = threeLayerTemplate(WebGLFunctionNode);
  assert.deepEqual(builder.traceFunctionCalls('layerOne'), ['layerOne']);
  assert.deepEqual(builder.traceFunctionCalls('layerTwo'), ['layerTwo', 'layerOne']);
  assert.deepEqual(builder.traceFunctionCalls('layerThree'), ['layerThree', 'layerTwo', 'layerOne']);
});

test('traceFunctionCalls: 3 layer test webgl2', () => {
  const builder = threeLayerTemplate(WebGL2FunctionNode);
  assert.deepEqual(builder.traceFunctionCalls('layerOne'), ['layerOne']);
  assert.deepEqual(builder.traceFunctionCalls('layerTwo'), ['layerTwo', 'layerOne']);
  assert.deepEqual(builder.traceFunctionCalls('layerThree'), ['layerThree', 'layerTwo', 'layerOne']);
});

/// Test the function tracing of 3 layers
test('webglString: 3 layer test cpu', () => {
  const builder = threeLayerTemplate(CPUFunctionNode);
  assert.equal(
    builder.getStringFromFunctionNames(['layerOne']),
    'function layerOne() {\nreturn 42;\n}'
  );
  assert.equal(
    builder.getString('layerOne'),
    builder.getStringFromFunctionNames(['layerOne'])
  );

  assert.equal(
    builder.getStringFromFunctionNames(['layerOne','layerTwo']),
    'function layerOne() {\nreturn 42;\n}\nfunction layerTwo() {\nreturn (layerOne()*2);\n}'
  );
  assert.equal(
    builder.getString('layerTwo'),
    builder.getStringFromFunctionNames(['layerOne','layerTwo'])
  );

  assert.equal(
    builder.getStringFromFunctionNames(['layerOne','layerTwo','layerThree']),
    'function layerOne() {\nreturn 42;\n}\nfunction layerTwo() {\nreturn (layerOne()*2);\n}\nfunction layerThree() {\nreturn (layerTwo()*2);\n}'
  );
  assert.equal(
    builder.getString('layerThree'),
    builder.getStringFromFunctionNames(['layerOne','layerTwo','layerThree'])
  );
  assert.equal(
    builder.getString(null),
    builder.getString('layerThree')
  );
});

test('webglString: 3 layer test webgl', () => {
  const builder = threeLayerTemplate(WebGLFunctionNode);
  assert.equal(
    builder.getStringFromFunctionNames(['layerOne']),
    'float layerOne() {\nreturn 42.0;\n}'
  );
  assert.equal(
    builder.getString('layerOne'),
    builder.getStringFromFunctionNames(['layerOne'])
  );

  assert.equal(
    builder.getStringFromFunctionNames(['layerOne','layerTwo']),
    'float layerOne() {\nreturn 42.0;\n}\nfloat layerTwo() {\nreturn (layerOne()*2.0);\n}'
  );
  assert.equal(
    builder.getString('layerTwo'),
    builder.getStringFromFunctionNames(['layerOne','layerTwo'])
  );

  assert.equal(
    builder.getStringFromFunctionNames(['layerOne','layerTwo','layerThree']),
    'float layerOne() {\nreturn 42.0;\n}\nfloat layerTwo() {\nreturn (layerOne()*2.0);\n}\nfloat layerThree() {\nreturn (layerTwo()*2.0);\n}'
  );
  assert.equal(
    builder.getString('layerThree'),
    builder.getStringFromFunctionNames(['layerOne','layerTwo','layerThree'])
  );
  assert.equal(
    builder.getString(null),
    builder.getString('layerThree')
  );
});

test('webglString: 3 layer test webgl2', () => {
  const builder = threeLayerTemplate(WebGL2FunctionNode);
  assert.notEqual(builder, null, 'class creation check');

  assert.equal(
    builder.getStringFromFunctionNames(['layerOne']),
    'float layerOne() {\nreturn 42.0;\n}'
  );
  assert.equal(
    builder.getString('layerOne'),
    builder.getStringFromFunctionNames(['layerOne'])
  );

  assert.equal(
    builder.getStringFromFunctionNames(['layerOne','layerTwo']),
    'float layerOne() {\nreturn 42.0;\n}\nfloat layerTwo() {\nreturn (layerOne()*2.0);\n}'
  );
  assert.equal(
    builder.getString('layerTwo'),
    builder.getStringFromFunctionNames(['layerOne','layerTwo'])
  );

  assert.equal(
    builder.getStringFromFunctionNames(['layerOne','layerTwo','layerThree']),
    'float layerOne() {\nreturn 42.0;\n}\nfloat layerTwo() {\nreturn (layerOne()*2.0);\n}\nfloat layerThree() {\nreturn (layerTwo()*2.0);\n}'
  );
  assert.equal(
    builder.getString('layerThree'),
    builder.getStringFromFunctionNames(['layerOne','layerTwo','layerThree'])
  );
  assert.equal(
    builder.getString(null),
    builder.getString('layerThree')
  );
});
