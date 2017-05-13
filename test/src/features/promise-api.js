function promiseApi_function_return( assert, mode ) {
	var gpu = new GPU();
	
	var kernel = function() {
		return 42.0;
	};
	
	var paramObj = {
		dimensions : [1],
		mode : mode
	}
	
	// Start of async test
	var done = assert.async();
	var promiseObj = null;
	
	// Setup kernel
	gpu.createKernel(kernel, paramObj);
	
	// Get promise objet
	promiseObj = gpu.execute();
	assert.ok( promiseObj !== null, "Promise object generated test");
	promiseObj.then(function(res) {
		assert.equal( res, 42.0 );
		done();
	}, function(err) {
		throw err;
	});
}

QUnit.test( "Promise API : function_return (auto)", function(assert) {
	promiseApi_function_return(assert, null);
});

QUnit.test( "Promise API : function_return (WebGL)", function(assert) {
	promiseApi_function_return(assert, "webgl");
});

QUnit.test( "Promise API : function_return (CPU)", function(assert) {
	promiseApi_function_return(assert, "cpu");
});
