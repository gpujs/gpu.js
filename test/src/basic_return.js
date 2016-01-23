function basic_return( mode ) {
	var f = GPU(function() {
		return 42.0;
	}, {
		thread : [1],
		block : [1],
		mode : mode
	});
	
	QUnit.ok( f !== null, "function generated test");
	QUnit.close(f(), 42.0, 0.01, "basic return function test");
}

QUnit.test( "basic_return (string)", function() {
	QUnit.equal( 
		GPU._jsStrToWebclglStr( "function() { return 42.0; }" ), 
		"void main() { out_float = 42.0; }", 
		"Basic return string conversion" 
	);
});

QUnit.test( "basic_return (auto)", function() {
	basic_return(null);
});

QUnit.test( "basic_return (GPU)", function() {
	basic_return("gpu");
});

QUnit.test( "basic_return (CPU)", function() {
	basic_return("cpu");
});
