function basic_booleanBranch( mode ) {
	var gpu = new GPU();
	var f = gpu.createKernel(function(x) {
		if (x[this.thread.x] > 0) {
			return 0;
		} else {
			return 1;
		}
	}, {
		dimensions : [4],
		mode : mode
	});
	
	QUnit.ok( f !== null, "function generated test");
	QUnit.deepEqual(f([1, 1, 0, 0]), [0, 0, 1, 1], "basic return function test");
}

QUnit.test( "basic_booleanBranch (auto)", function() {
	basic_booleanBranch(null);
});

QUnit.test( "basic_booleanBranch (GPU)", function() {
	basic_booleanBranch("gpu");
});

QUnit.test( "basic_booleanBranch (CPU)", function() {
	basic_booleanBranch("cpu");
});
