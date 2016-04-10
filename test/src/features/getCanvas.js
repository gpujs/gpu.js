function getCanvasTest( assert, mode ) {
	var gpu = new GPU();
	
	//assert.ok( f.getCanvas(), "testing for canvas before createKernel" );
	assert.ok( gpu.getCanvas(), "testing for canvas before createKernel" );
	
	var render = gpu.createKernel(function(a, b) {
		this.color(0, 0, 0, 1);
	}, {
		dimensions : [30,30],
		mode : mode
	}).graphical(true);;
	
	assert.ok( render !== null, "function generated test");
	
	assert.ok( render.getCanvas(), "testing for canvas before createKernel" );
	assert.ok( gpu.getCanvas(), "testing for canvas before createKernel" );
	
	var res = render();
	
	assert.ok( render.getCanvas(), "testing for canvas before createKernel" );
	assert.ok( gpu.getCanvas(), "testing for canvas before createKernel" );
	
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
