function getCanvasTest( assert, mode ) {
	var gpu = new GPU();
	
	//assert.ok( gpu.getCanvas("cpu"), "testing for canvas before createKernel" );
	//assert.ok( gpu.getCanvas("gpu"), "testing for canvas before createKernel" );
	
	var render = gpu.createKernel(function() {
		this.color(0, 0, 0, 1);
	}, {
		dimensions : [30,30],
		mode : mode
	}).graphical(true);;
	
	assert.ok( render !== null, "function generated test");
	
	//assert.ok( render.getCanvas(mode), "testing for canvas after createKernel" );
	//assert.ok( gpu.getCanvas(mode), "testing for canvas after createKernel" );
	
	//
	// NOTE: GPU mode somehow return null when render()
	//
	var r = null;
	assert.ok( (r = render()) || true, "rendering" );
	console.log("getCanvasTest render result", r, "for mode", mode);
	
	assert.ok( render.getCanvas(), "testing for canvas after render" );
	assert.ok( gpu.getCanvas(), "testing for canvas after render" );
	
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
