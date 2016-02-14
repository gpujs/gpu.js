///
/// Test the various basic functionality of functionBuilder
///

/// Test the function tracing of 3 layers
QUnit.test( "traceFunctionCalls: 3 layer test", function( assert ) {
	assert.notEqual( functionBuilder, null, "script include check" );
	
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
	var builder = new functionBuilder();
	assert.notEqual( builder, null, "class creation check" );
	
	builder.addFunction(null, layerOne);
	builder.addFunction(null, layerTwo);
	builder.addFunction(null, layerThree);
	
	assert.deepEqual( builder.traceFunctionCalls("layerOne"),   ["layerOne"] );
	assert.deepEqual( builder.traceFunctionCalls("layerTwo"),   ["layerTwo","layerOne"] );
	assert.deepEqual( builder.traceFunctionCalls("layerThree"), ["layerThree","layerTwo","layerOne"] );
});
