const FunctionBuilder = require('../../../src/backend/function-builder');
///
/// Test the various basic functionality of functionBuilder
///

// Three layer template for multiple tests
function threeLayerTemplate() {
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
	var builder = new FunctionBuilder();
	builder.addFunction(null, layerOne);
	builder.addFunction(null, layerTwo);
	builder.addFunction(null, layerThree);
	return builder;
}

/// Test the function tracing of 3 layers
QUnit.test( "traceFunctionCalls: 3 layer test", function( assert ) {
	assert.notEqual( FunctionBuilder, null, "script include check" );
	var builder = threeLayerTemplate();
	assert.notEqual( builder, null, "class creation check" );
	
	assert.deepEqual( builder.traceFunctionCalls("layerOne"),   ["layerOne"] );
	assert.deepEqual( builder.traceFunctionCalls("layerTwo"),   ["layerTwo","layerOne"] );
	assert.deepEqual( builder.traceFunctionCalls("layerThree"), ["layerThree","layerTwo","layerOne"] );
});

/// Test the function tracing of 3 layers
QUnit.test( "webglString: 3 layer test", function( assert ) {
	assert.notEqual( FunctionBuilder, null, "script include check" );
	var builder = threeLayerTemplate();
	assert.notEqual( builder, null, "class creation check" );
	
	assert.equal(
		builder.webGlStringFromFunctionNames(["layerOne"]),
		"float layerOne() {\nreturn 42.0;\n}"
	);
	assert.equal(
		builder.webGlString("layerOne"),
		builder.webGlStringFromFunctionNames(["layerOne"])
	);
	
	assert.equal(
		builder.webGlStringFromFunctionNames(["layerOne","layerTwo"]),
		"float layerOne() {\nreturn 42.0;\n}\nfloat layerTwo() {\nreturn (layerOne()*2.0);\n}"
	);
	assert.equal(
		builder.webGlString("layerTwo"),
		builder.webGlStringFromFunctionNames(["layerOne","layerTwo"])
	);
	
	
	assert.equal(
		builder.webGlStringFromFunctionNames(["layerOne","layerTwo","layerThree"]),
		"float layerOne() {\nreturn 42.0;\n}\nfloat layerTwo() {\nreturn (layerOne()*2.0);\n}\nfloat layerThree() {\nreturn (layerTwo()*2.0);\n}"
	);
	assert.equal(
		builder.webGlString("layerThree"),
		builder.webGlStringFromFunctionNames(["layerOne","layerTwo","layerThree"])
	);
	assert.equal(
		builder.webGlString(null),
		builder.webGlString("layerThree")
	);
});
