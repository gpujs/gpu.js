function basic_return( assert, mode ) {
	var f = GPU(function() {
		return 42.0;
	}, {
		thread : [1],
		block : [1],
		mode : mode
	});
	
	assert.ok( f !== null, "function generated test");
	assert.equal(f(), 42.0, "basic return function test");
}

QUnit.test( "basic_return (string)", function( assert ) {
	assert.equal( GPU._jsStrToWebclglStr( "function() { return 42.0; }" ), "", "Basic return string conversion" );
});

QUnit.test( "basic_return (auto)", function( assert ) {
	basic_return(assert, null);
});

QUnit.test( "basic_return (GPU)", function( assert ) {
	basic_return(assert, "gpu");
});

QUnit.test( "basic_return (CPU)", function( assert ) {
	basic_return(assert, "cpu");
});
