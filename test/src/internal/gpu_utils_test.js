///
/// Test the various basic functionality of functionNode
///

QUnit.test( "gpu_utils: system_endianness not null", function( assert ) {
	assert.ok( gpu_utils.system_endianness() != null, "not null check" );
	assert.ok( gpu_utils.system_endianness() == "LE" ||  gpu_utils.system_endianness() == "BE", "value = "+gpu_utils.system_endianness() );
});
