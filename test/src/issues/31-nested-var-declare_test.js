//
// See: https://github.com/gpujs/gpu.js/issues/31
//
function nestedVarDeclareFunction() {
	var ret = 0.0;
	
	// outer loop limit is effectively skipped in CPU
	for(var i=0; i<10; ++i) {
		// inner loop limit should be higher, to avoid infinite loops
		for(var i=0; i<20; ++i) {
			ret += 1;
		}
	}
	
	return ret;
}

function nestedVarDeclareTest( mode ) {
	var gpu = new GPU();
	var f = gpu.createKernel(nestedVarDeclareFunction, {
		dimensions : [1],
		mode : mode
	});

	QUnit.ok( f !== null, "function generated test");
	QUnit.close(f(), 20, 0.00, "basic return function test");
}

QUnit.test( "Issue #31 - nestedVarDeclare (auto)", function() {
	nestedVarDeclareTest(null);
});

QUnit.test( "Issue #31 - nestedVarDeclare (GPU)", function() {
	nestedVarDeclareTest("gpu");
});

QUnit.test( "Issue #31 - nestedVarDeclare (CPU)", function() {
	nestedVarDeclareTest("cpu");
});

QUnit.test( "Issue #31 - nestedVarDeclare : AST handling", function() {
	var builder = new functionBuilder();
	builder.addFunction(null, nestedVarDeclareFunction);
	
	QUnit.equal(
		builder.webglString_fromFunctionNames(["nestedVarDeclareFunction"]).replace(new RegExp("\n", "g"), ""),
		"float nestedVarDeclareFunction() {"+
			"float user_ret=0.0;"+
			";"+
			""+
			"for (float user_i=0.0;(user_i<10.0);++user_i){"+
				"for (user_i=0.0;(user_i<20.0);++user_i){"+
					"user_ret+=1.0;"+
				"}"+
			"}"+
			""+
			"return user_ret;"+
		"}"
	);
});
