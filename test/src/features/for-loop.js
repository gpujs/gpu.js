function for_loop_test( assert, mode ) {
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

QUnit.test( "for_loop (auto)", function( assert ) {
	for_loop_test(assert, null);
});

QUnit.test( "for_loop (WebGL)", function( assert ) {
	for_loop_test(assert, "webgl");
});

QUnit.test( "for_loop (CPU)", function( assert ) {
	for_loop_test(assert, "cpu");
});

// Prevent test function leak
(function() {

	function evil_while_kernalFunction(a, b) {
		var x = 0.0;
		var i = 0;

		//10000000 or 10 million is the approx upper limit on a chrome + GTX 780
		while(i<100) {
			x = x + 1.0;
			++i;
		}

		return (a[this.thread.x] + b[this.thread.x] + x);
	}

	var evil_while_a = [1, 2, 3, 5, 6, 7];
	var evil_while_b = [4, 5, 6, 1, 2, 3];
	var evil_while_cpuRef = new GPU();
	var evil_while_cpuRef_f =  evil_while_cpuRef.createKernel(evil_while_kernalFunction, {
		dimensions : [6],
		mode : "cpu",
		loopMaxIterations: 10000
	});

	var evil_while_exp = evil_while_cpuRef_f(evil_while_a,evil_while_b);

	function evil_while_loop_test( assert, mode ) {
		var gpu = new GPU();

		var f = gpu.createKernel(evil_while_kernalFunction, {
			dimensions : [6],
			mode : mode
		});

		assert.ok( f !== null, "function generated test");

		var res = f(evil_while_a,evil_while_b);

		for(var i = 0; i < evil_while_exp.length; ++i) {
			QUnit.close(evil_while_exp[i], res[i], 0.1, "Result arr idx: "+i);
		}
	}

	QUnit.test( "evil_while_loop (auto)", function( assert ) {
		evil_while_loop_test(assert, null);
	});

	QUnit.test( "evil_while_loop (WebGL)", function( assert ) {
		evil_while_loop_test(assert, "webgl");
	});

	QUnit.test( "evil_while_loop (CPU)", function( assert ) {
		evil_while_loop_test(assert, "cpu");
	});

})();
