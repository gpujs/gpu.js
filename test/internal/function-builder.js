var GPU = require('../../src/index');

(function() {
  ///
  /// Test the various basic functionality of functionBuilder
  ///

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
    const builder = new GPU.FunctionBuilder();
    builder.addFunctionNode(new FunctionNode(layerOne.toString()));
    builder.addFunctionNode(new FunctionNode(layerTwo.toString()));
    builder.addFunctionNode(new FunctionNode(layerThree.toString()));
    return builder;
  }

  /// Test the function tracing of 3 layers
  QUnit.test('traceFunctionCalls: 3 layer test (cpu)', function(assert) {
    var builder = threeLayerTemplate(GPU.CPUFunctionNode);
    assert.deepEqual(builder.traceFunctionCalls('layerOne'), ['layerOne']);
    assert.deepEqual(builder.traceFunctionCalls('layerTwo'), ['layerTwo', 'layerOne']);
    assert.deepEqual(builder.traceFunctionCalls('layerThree'), ['layerThree', 'layerTwo', 'layerOne']);
  });

  QUnit.test('traceFunctionCalls: 3 layer test (webgl)', function(assert) {
    var builder = threeLayerTemplate(GPU.WebGLFunctionNode);
    assert.deepEqual(builder.traceFunctionCalls('layerOne'), ['layerOne']);
    assert.deepEqual(builder.traceFunctionCalls('layerTwo'), ['layerTwo', 'layerOne']);
    assert.deepEqual(builder.traceFunctionCalls('layerThree'), ['layerThree', 'layerTwo', 'layerOne']);
  });

  QUnit.test('traceFunctionCalls: 3 layer test (webgl2)', function(assert) {
    var builder = threeLayerTemplate(GPU.WebGL2FunctionNode);
    assert.deepEqual(builder.traceFunctionCalls('layerOne'), ['layerOne']);
    assert.deepEqual(builder.traceFunctionCalls('layerTwo'), ['layerTwo', 'layerOne']);
    assert.deepEqual(builder.traceFunctionCalls('layerThree'), ['layerThree', 'layerTwo', 'layerOne']);
  });

  /// Test the function tracing of 3 layers
  QUnit.test('webglString: 3 layer test (cpu)', function(assert) {
    var builder = threeLayerTemplate(GPU.CPUFunctionNode);
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

  QUnit.test('webglString: 3 layer test (webgl)', function(assert) {
    var builder = threeLayerTemplate(GPU.WebGLFunctionNode);
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

  QUnit.test('webglString: 3 layer test (webgl)', function(assert) {
    var builder = threeLayerTemplate(GPU.WebGL2FunctionNode);
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
})();
