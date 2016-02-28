///
/// Test the gpu_utils functions
///

QUnit.test( "gpu_utils: system_endianness not null", function( assert ) {
	assert.ok( gpu_utils.system_endianness() != null, "not null check" );
	assert.ok( gpu_utils.system_endianness() == "LE" ||  gpu_utils.system_endianness() == "BE", "value = "+gpu_utils.system_endianness() );
});

QUnit.test( "gpu_utils: isFunction", function( assert ) {
	assert.ok( gpu_utils.isFunction( function() { } ) );
	assert.notOk( gpu_utils.isFunction( {} ) );
});

QUnit.test( "gpu_utils: isFunctionString", function( assert ) {
	assert.ok( gpu_utils.isFunctionString( "function() { }" ) );
	assert.notOk( gpu_utils.isFunctionString( {} ) );
});

QUnit.test( "gpu_utils: getFunctionName_fromString", function( assert ) {
	assert.equal( "test", gpu_utils.getFunctionName_fromString( "function test() { }" ) );
});

QUnit.test( "gpu_utils: getParamNames_fromString", function( assert ) {
	assert.deepEqual( ["a","b","c"], gpu_utils.getParamNames_fromString( "function test(a,b,c) { }" ) );
});
