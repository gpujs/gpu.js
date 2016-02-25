/*
function booleanBranch( mode ) {
	var f = GPU(function() {
		var ret = 0.0;
		if(true) {
			ret = 4.0;
		} else {
			ret = 2.0;
		}
		return ret;
	}, {
		thread : [1],
		block : [1],
		mode : mode
	});
	
	QUnit.ok( f !== null, "function generated test");
	QUnit.close(f(), 42.0, 0.01, "basic return function test");
}

QUnit.test( "booleanBranch (auto)", function() {
	booleanBranch(null);
});

QUnit.test( "booleanBranch (GPU)", function() {
	booleanBranch("gpu");
});

QUnit.test( "booleanBranch (CPU)", function() {
	booleanBranch("cpu");
});
*/

function if_else( mode ) {
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

QUnit.test( "if_else (auto)", function() {
	if_else(null);
});

QUnit.test( "if_else (GPU)", function() {
	if_else("gpu");
});

QUnit.test( "if_else (CPU)", function() {
	if_else("cpu");
});
