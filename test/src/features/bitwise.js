function bitwiseTest( descPrefix, mode, bitfunction, expectedResult ) {
	var gpu = new GPU();
	var f = gpu.createKernel(bitfunction, {
		dimensions : [1],
		mode : mode,
		normalizeResult : true
	});

	QUnit.ok( f !== null, descPrefix+" - function generated test");
	QUnit.close(f()[0], expectedResult, 0.001, descPrefix+"basic return function test");
}

function bitwiseAND_test( mode ) {
	bitwiseTest("1 & 1", mode, function() { return 1 & 1 }, 1);
}

QUnit.test( "bitwise AND (auto)", function() {
	bitwiseAND_test(null);
});

QUnit.test( "bitwise AND (cpu)", function() {
	bitwiseAND_test("cpu");
});

QUnit.test( "bitwise AND (gpu)", function() {
	bitwiseAND_test("gpu");
});
