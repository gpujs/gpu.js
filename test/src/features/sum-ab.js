function sum_AB_test(mode) {
	var gpu = new GPU({ mode });
	var f = gpu.createKernel(function(a, b) {
		return (a[this.thread.x] + b[this.thread.x]);
	}, {
    output : [6],
		mode : mode
	});
	
	QUnit.assert.ok( f !== null, "function generated test");
	
	var a = [1, 2, 3, 5, 6, 7];
	var b = [4, 5, 6, 1, 2, 3];
	
	var res = f(a,b);
	var exp = [5, 7, 9, 6, 8, 10];
	
	for(var i = 0; i < exp.length; ++i) {
		QUnit.assert.close(res[i], exp[i], 0.1, "Result arr idx: "+i);
	}
}

QUnit.test( "sum_AB (auto)", function() {
	sum_AB_test(null);
});

QUnit.test( "sum_AB (WebGL)", function() {
	sum_AB_test("webgl");
});

QUnit.test( "sum_AB (CPU)", function() {
	sum_AB_test("cpu");
});
