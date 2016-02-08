function basic_for_loop_test( assert, mode ) {
	var gpu = new GPU();
	var f = gpu.createKernel(function(a, b) {
		var x = 0.0;
		for(var i = 0.0; i<10.0; i++) {
			x = x + 1.0;
		}
		
		return (a[this.thread.x] + b[this.thread.x] + x);
	}, {
		dimensions : [6],
		mode : mode
	});
	
	assert.ok( f !== null, "function generated test");
	
	var a = [1, 2, 3, 5, 6, 7];
	var b = [4, 5, 6, 1, 2, 3];
	
	var res = f(a,b);
	var exp = [15, 17, 19, 16, 18, 20];
	
	for(var i = 0; i < exp.length; ++i) {
		QUnit.close(exp[i], res[i], 0.1, "Result arr idx: "+i);
	}
}

QUnit.test( "basic_for_loop (auto)", function( assert ) {
	basic_for_loop_test(assert, null);
});

QUnit.test( "basic_for_loop (GPU)", function( assert ) {
	basic_for_loop_test(assert, "gpu");
});

QUnit.test( "basic_for_loop (CPU)", function( assert ) {
	basic_for_loop_test(assert, "cpu");
});
