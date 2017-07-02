///
/// Test the CPU/WebGlKernelRunner
///

QUnit.test( "CPUKernelRunner : Hello world", function( assert ) {
	// Sanity check
	assert.ok(CPUKernelRunner.run);

	// Precompiled obj
	var cache = {};
	var kernelObj = {
		headerStr : "",
		kernelStr : "return 42.0;",
		paramNames : ["A"],
		grpahical  : false,
		dimensions : [5],
		constants : null
	}

	// Run it
	var args = [[1,2,3,4,5]];
	var res = CPUKernelRunner.run(cache,kernelObj,args);

	// Check results
	var exp = [42.0, 42.0, 42.0, 42.0, 42.0];
	for(var i = 0; i < exp.length; ++i) {
		assert.close(res[i], exp[i], 0.1, "Result arr idx: "+i);
	}
});

QUnit.test( "CPUKernelRunner : Simple sum", function( assert ) {
	// Sanity check
	assert.ok(CPUKernelRunner.run);

	// Precompiled obj
	var cache = {};
	var kernelObj = {
		headerStr : "",
		kernelStr : "return A[this.thread.x]+B[this.thread.y];",
		paramNames : ["A", "B"],
		grpahical  : false,
		dimensions : [2, 2],
		constants : null
	}

	// Run it
	var args = [[1,2],[10,20]];
	var res = CPUKernelRunner.run(cache,kernelObj,args);

	// Check results
	var exp = [[11,12],[21,22]];
	for(var x = 0; x < 2; ++x) {
		for(var y=0; y < 2; ++y) {
			assert.close(res[x][y], exp[x][y], 0.1, "Result arr idx: "+x+"/"+y);
		}
	}
});

QUnit.test( "CPUKernelRunner : Parent Sum", function( assert ) {
	// Sanity check
	assert.ok(CPUKernelRunner.run);

	// Precompiled obj
	var cache = {};
	var kernelObj = {
		headerStr : "function pSum(q,w) { return q+w; }",
		kernelStr : "return pSum(A[this.thread.x],B[this.thread.y]);",
		paramNames : ["A", "B"],
		grpahical  : false,
		dimensions : [2, 2],
		constants : null
	}

	// Run it
	var args = [[1,2],[10,20]];
	var res = CPUKernelRunner.run(cache,kernelObj,args);

	// Check results
	var exp = [[11,12],[21,22]];
	for(var x = 0; x < 2; ++x) {
		for(var y=0; y < 2; ++y) {
			assert.close(res[x][y], exp[x][y], 0.1, "Result arr idx: "+x+"/"+y);
		}
	}
});