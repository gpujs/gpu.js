///
/// Test the GPUUtils functions
///

QUnit.test( "GPU.utils: systemEndianness not null", function( assert ) {
	assert.ok( GPU.utils.systemEndianness() !== null, "not null check" );
	assert.ok( GPU.utils.systemEndianness() === "LE" ||  GPU.utils.systemEndianness() === "BE", "value = " + GPU.utils.systemEndianness() );
});

QUnit.test( "GPU.utils: isFunction", function( assert ) {
	assert.ok( GPU.utils.isFunction( function() { } ) );
	assert.notOk( GPU.utils.isFunction( {} ) );
});

QUnit.test( "GPU.utils: isFunctionString", function( assert ) {
	assert.ok( GPU.utils.isFunctionString( "function() { }" ) );
	assert.notOk( GPU.utils.isFunctionString( {} ) );
});

QUnit.test( "GPU.utils: getFunctionName_fromString", function( assert ) {
	assert.equal( "test", GPU.utils.getFunctionNameFromString( "function test() { }" ) );
});

QUnit.test( "GPU.utils: getParamNames_fromString", function( assert ) {
	assert.deepEqual( ["a","b","c"], GPU.utils.getParamNamesFromString( "function test(a,b,c) { }" ) );
});
