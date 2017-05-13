function function_return( mode ) {
	var gpu = new GPU();
	var f = gpu.createKernel(function() {
		return 42.0;
	}, {
		dimensions : [1],
		mode : mode
	});
	
	QUnit.ok( f !== null, "function generated test");
	QUnit.close(f(), 42.0, 0.01, "basic return function test");
}

QUnit.test( "function_return (auto)", function() {
	function_return(null);
});

QUnit.test( "function_return (WebGL)", function() {
	function_return("webgl");
});

QUnit.test( "function_return (CPU)", function() {
	function_return("cpu");
});
