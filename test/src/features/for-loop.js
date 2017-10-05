function for_loop_test(mode) {
	var gpu = new GPU({ mode: mode });
	var f = gpu.createKernel(function(a, b) {
		var x = 0;
		for(var i = 0; i < 10; i++) {
			x = x + 1;
		}

		return (a[this.thread.x] + b[this.thread.x] + x);
	}, {
		output : [6]
	});

	QUnit.assert.ok( f !== null, "function generated test");

	var a = [1, 2, 3, 5, 6, 7];
	var b = [4, 5, 6, 1, 2, 3];

	var res = f(a,b);
	var exp = [15, 17, 19, 16, 18, 20];

	for(var i = 0; i < exp.length; ++i) {
		QUnit.assert.close(res[i], exp[i], 0.1, "Result arr idx: "+i);
	}
}

QUnit.test( "for_loop (auto)", function() {
	for_loop_test(null);
});

QUnit.test( "for_loop (WebGL)", function() {
	for_loop_test("webgl");
});

QUnit.test( "for_loop (CPU)", function() {
	for_loop_test("cpu");
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
	var evil_while_cpuRef = new GPU({ mode: 'cpu' });
	var evil_while_cpuRef_f =  evil_while_cpuRef.createKernel(evil_while_kernalFunction, {
    output : [6],
		loopMaxIterations: 10000
	});

	var evil_while_exp = evil_while_cpuRef_f(evil_while_a,evil_while_b);

	function evil_while_loop_test(mode ) {
		var gpu = new GPU({ mode: mode });

		var f = gpu.createKernel(evil_while_kernalFunction, {
      output : [6]
		});

		QUnit.assert.ok( f !== null, "function generated test");

		var res = f(evil_while_a,evil_while_b);

		for(var i = 0; i < evil_while_exp.length; ++i) {
			QUnit.assert.close(evil_while_exp[i], res[i], 0.1, "Result arr idx: "+i);
		}
	}

	QUnit.test( "evil_while_loop (auto)", function() {
		evil_while_loop_test(null);
	});

	QUnit.test( "evil_while_loop (WebGL)", function() {
		evil_while_loop_test("webgl");
	});

	QUnit.test( "evil_while_loop (CPU)", function() {
		evil_while_loop_test("cpu");
	});

})();

function for_constant_loop_test(mode) {
  var gpu = new GPU({ mode: mode });
  var f = gpu.createKernel(function(a, b) {
    var x = 0;
    for(var i = 0; i < this.constants.max; i++) {
      x = x + 1;
    }

    return (a[this.thread.x] + b[this.thread.x] + x);
  }, {
    output : [6],
    constants: {
      max: 10
    }
  });

  QUnit.assert.ok( f !== null, "function generated test");

  var a = [1, 2, 3, 5, 6, 7];
  var b = [4, 5, 6, 1, 2, 3];

  var res = f(a,b);
  var exp = [15, 17, 19, 16, 18, 20];

  for(var i = 0; i < exp.length; ++i) {
    QUnit.assert.close(res[i], exp[i], 0.1, "Result arr idx: "+i);
  }
}

QUnit.test( "for_constant_loop_test (auto)", function() {
  for_constant_loop_test(null);
});

QUnit.test( "for_constant_loop_test (WebGL)", function() {
  for_constant_loop_test("webgl");
});

QUnit.test( "for_constant_loop_test (CPU)", function() {
  for_constant_loop_test("cpu");
});
