function promiseApi_function_return( assert, mode ) {
	var gpu = new GPU();
	
	var kernelFn = function() {
		return 42.0;
	};
	
	var paramObj = {
    output : [1]
	};
	
	// Start of async test
	var done = assert.async();
	var promiseObj;
	
	// Setup kernel
	var kernel = gpu.createKernel(kernelFn, paramObj);
	// Get promise objet
	promiseObj = kernel.execute();
	assert.ok( promiseObj !== null, "Promise object generated test");
	promiseObj.then(function(res) {
		assert.equal( res[0], 42.0 );
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
