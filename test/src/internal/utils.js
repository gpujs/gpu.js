///
/// Test the GPUUtils functions
///

QUnit.test( "Utils: systemEndianness not null", function( assert ) {
	assert.ok( Utils.systemEndianness() !== null, "not null check" );
	assert.ok( Utils.systemEndianness() === "LE" ||  Utils.systemEndianness() === "BE", "value = " + Utils.systemEndianness() );
});

QUnit.test( "Utils: isFunction", function( assert ) {
	assert.ok( Utils.isFunction( function() { } ) );
	assert.notOk( Utils.isFunction( {} ) );
});

QUnit.test( "Utils: isFunctionString", function( assert ) {
	assert.ok( Utils.isFunctionString( "function() { }" ) );
	assert.notOk( Utils.isFunctionString( {} ) );
});

QUnit.test( "Utils: getFunctionName_fromString", function( assert ) {
	assert.equal( "test", Utils.getFunctionNameFromString( "function test() { }" ) );
});

QUnit.test( "Utils: getParamNames_fromString", function( assert ) {
	assert.deepEqual( ["a","b","c"], Utils.getParamNamesFromString( "function test(a,b,c) { }" ) );
});
