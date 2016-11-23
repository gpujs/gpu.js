function bitwiseTest( descPrefix, mode, bitfunction, expectedResult ) {
	var gpu = new GPU();
	var f = gpu.createKernel(bitfunction, {
		dimensions : [1],
		mode : mode,
		normalizeResult : true
	});

	QUnit.ok( f !== null, descPrefix+" - function generated test");
	QUnit.close(f()[0], expectedResult, 0.001, descPrefix+" - basic return function test");
}

//------------------------------------
//
//   bitwise AND
//
//------------------------------------

function bitwiseAND_test( mode ) {
	bitwiseTest("1 & 1", mode, function() { return 1 & 1 }, 1);
	bitwiseTest("1 & 2", mode, function() { return 1 & 2 }, 0);
	//bitwiseTest("-1 & -1", mode, function() { return -1 & -1 }, -1);
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

//------------------------------------
//
//   bitwise OR
//
//------------------------------------

function bitwiseOR_test( mode ) {
	bitwiseTest("1 | 1", mode, function() { return 1 | 1 }, 1);
	bitwiseTest("1 | 2", mode, function() { return 1 | 2 }, 3);
	bitwiseTest("1 | 5", mode, function() { return 1 | 5 }, 5);
	//bitwiseTest("-1 | -1", mode, function() { return -1 | -1 }, -1);
}

QUnit.test( "bitwise OR (auto)", function() {
	bitwiseOR_test(null);
});

QUnit.test( "bitwise OR (cpu)", function() {
	bitwiseOR_test("cpu");
});

QUnit.test( "bitwise OR (gpu)", function() {
	bitwiseOR_test("gpu");
});

//------------------------------------
//
//   bitwise XOR
//
//------------------------------------

function bitwiseXOR_test( mode ) {
	bitwiseTest("1 ^ 1", mode, function() { return 1 ^ 1 }, 0);
	bitwiseTest("1 ^ 2", mode, function() { return 1 ^ 2 }, 3);
	bitwiseTest("1 ^ 5", mode, function() { return 1 ^ 5 }, 2);
	//bitwiseTest("-1 | -1", mode, function() { return -1 | -1 }, -1);
}

QUnit.test( "bitwise XOR (auto)", function() {
	bitwiseOR_test(null);
});

QUnit.test( "bitwise XOR (cpu)", function() {
	bitwiseOR_test("cpu");
});

QUnit.test( "bitwise XOR (gpu)", function() {
	bitwiseOR_test("gpu");
});

//------------------------------------
//
//   bitwise LEFT SHIFT
//
//------------------------------------

function bitwiseLShift_test( mode ) {
	bitwiseTest("1 << 1", mode, function() { return 1 << 1 }, 2);
	bitwiseTest("2 << 2", mode, function() { return 1 << 2 }, 4);
	bitwiseTest("1 << 5", mode, function() { return 1 << 5 }, 32);
	bitwiseTest("35 << 2", mode, function() { return 35 << 2 }, 140);
	//bitwiseTest("-1 | -1", mode, function() { return -1 | -1 }, -1);
}

QUnit.test( "bitwise LShift (auto)", function() {
	bitwiseLShift_test(null);
});

QUnit.test( "bitwise LShift (cpu)", function() {
	bitwiseLShift_test("cpu");
});

QUnit.test( "bitwise LShift (gpu)", function() {
	bitwiseLShift_test("gpu");
});

//------------------------------------
//
//   bitwise RIGHT SHIFT
//
//------------------------------------

function bitwiseRShift_test( mode ) {
	bitwiseTest("1 >> 1", mode, function() { return 1 >> 1 }, 0);
	bitwiseTest("12354 >> 2", mode, function() { return 12354 >> 2 }, 3088);
	bitwiseTest("1 >> 5", mode, function() { return 1 >> 5 }, 0);
	bitwiseTest("35 >> 2", mode, function() { return 35 >> 2 }, 8);
	//bitwiseTest("-1 | -1", mode, function() { return -1 | -1 }, -1);
}

QUnit.test( "bitwise RShift (auto)", function() {
	bitwiseRShift_test(null);
});

QUnit.test( "bitwise RShift (cpu)", function() {
	bitwiseRShift_test("cpu");
});

QUnit.test( "bitwise RShift (gpu)", function() {
	bitwiseRShift_test("gpu");
});

//------------------------------------
//
//   bitwise UNSIGNED RIGHT SHIFT
//
//------------------------------------

function bitwiseURShift_test( mode ) {
	bitwiseTest("1 >>> 1", mode, function() { return 1 >>> 1 }, 0);
	bitwiseTest("12354 >>> 2", mode, function() { return 12354 >>> 2 }, 3088);
	bitwiseTest("1 >>> 5", mode, function() { return 1 >>> 5 }, 0);
	bitwiseTest("35 >>> 2", mode, function() { return 35 >>> 2 }, 8);
	//bitwiseTest("-1 | -1", mode, function() { return -1 | -1 }, -1);
}

QUnit.test( "bitwise URShift (auto)", function() {
	bitwiseURShift_test(null);
});

QUnit.test( "bitwise URShift (cpu)", function() {
	bitwiseURShift_test("cpu");
});

QUnit.test( "bitwise URShift (gpu)", function() {
	bitwiseURShift_test("gpu");
});
