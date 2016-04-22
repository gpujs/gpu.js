//
// See: https://github.com/gpujs/gpu.js/issues/31
//
function nestedVarDeclare( mode ) {
	var gpu = new GPU();
	var f = gpu.createKernel(function() {
		var ret = 0.0;
		
		// outer loop limit is effectively skipped in CPU
		for(var i=0; i<10; ++i) {
			// inner loop limit should be higher, to avoid infinite loops
			for(var i=0; i<20; ++i) {
				ret += 1;
			}
		}
		
		return ret;
	}, {
		dimensions : [1],
		mode : mode
	});

	QUnit.ok( f !== null, "function generated test");
	QUnit.close(f(), 20, 0.00, "basic return function test");
}

QUnit.test( "Issue #31 - nestedVarDeclare (auto)", function() {
	nestedVarDeclare(null);
});

QUnit.test( "Issue #31 - nestedVarDeclare (GPU)", function() {
	nestedVarDeclare("gpu");
});

QUnit.test( "Issue #31 - nestedVarDeclare (CPU)", function() {
	nestedVarDeclare("cpu");
});
