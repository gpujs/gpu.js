function getCanvasTest( assert, mode ) {
	var gpu = new GPU();
	
	//assert.ok( f.getCanvas(), "testing for canvas before createKernel" );
	assert.ok( gpu.getCanvas(), "testing for canvas before createKernel" );
	
	var f = gpu.createKernel(function(a, b) {
		return (a[this.thread.x] + b[this.thread.x]);
	}, {
		dimensions : [6],
		mode : mode
	});
	
	assert.ok( f.getCanvas(), "testing for canvas before createKernel" );
	assert.ok( gpu.getCanvas(), "testing for canvas before createKernel" );
	
	// assert.ok( f !== null, "function generated test");
	// 
	// var a = [1, 2, 3, 5, 6, 7];
	// var b = [4, 5, 6, 1, 2, 3];
	// 
	// var res = f(a,b);
	// var exp = [5, 7, 9, 6, 8, 10];
	// 
	// for(var i = 0; i < exp.length; ++i) {
	// 	QUnit.close(res[i], exp[i], 0.1, "Result arr idx: "+i);
	// }
}

QUnit.test( "getCanvas (auto)", function( assert ) {
	getCanvasTest(assert, null);
});

QUnit.test( "getCanvas (GPU)", function( assert ) {
	getCanvasTest(assert, "gpu");
});

QUnit.test( "getCanvas (CPU)", function( assert ) {
	getCanvasTest(assert, "cpu");
});
