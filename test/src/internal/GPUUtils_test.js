///
/// Test the GPUUtils functions
///

QUnit.test( "GPUUtils: systemEndianness not null", function( assert ) {
	assert.ok( GPUUtils.systemEndianness !== null, "not null check" );
	assert.ok( GPUUtils.systemEndianness === "LE" ||  GPUUtils.systemEndianness == "BE", "value = "+GPUUtils.systemEndianness );
});

QUnit.test( "GPUUtils: isFunction", function( assert ) {
	assert.ok( GPUUtils.isFunction( function() { } ) );
	assert.notOk( GPUUtils.isFunction( {} ) );
});

QUnit.test( "GPUUtils: isFunctionString", function( assert ) {
	assert.ok( GPUUtils.isFunctionString( "function() { }" ) );
	assert.notOk( GPUUtils.isFunctionString( {} ) );
});

QUnit.test( "GPUUtils: getFunctionName_fromString", function( assert ) {
	assert.equal( "test", GPUUtils.getFunctionNameFromString( "function test() { }" ) );
});

QUnit.test( "GPUUtils: getParamNames_fromString", function( assert ) {
	assert.deepEqual( ["a","b","c"], GPUUtils.getParamNamesFromString( "function test(a,b,c) { }" ) );
});
