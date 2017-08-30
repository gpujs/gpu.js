function booleanBranch(mode) {
	var gpu = new GPU({
    mode: mode
  });
	var f = gpu.createKernel(function() {
		var result = 0.0;
		if(true) {
      result = 4.0;
		} else {
      result = 2.0;
		}
		return result;
	}, {
    output : [1]
	});

	QUnit.assert.ok( f !== null, "function generated test");
	QUnit.assert.close(f()[0], 4, 0.01, "basic return function test");
}

QUnit.test( "booleanBranch (auto)", function() {
	booleanBranch(null);
});

QUnit.test( "booleanBranch (WebGL)", function() {
	booleanBranch("webgl");
});

QUnit.test( "booleanBranch (CPU)", function() {
	booleanBranch("cpu");
});


function if_else( mode ) {
	var gpu = new GPU({ mode });
	var f = gpu.createKernel(function(x) {
		if (x[this.thread.x] > 0) {
			return 0;
		} else {
			return 1;
		}
	}, {
    output : [4]
	});

	QUnit.assert.ok( f !== null, "function generated test");
	QUnit.assert.deepEqual(QUnit.extend([], f([1, 1, 0, 0])), [0, 0, 1, 1], "basic return function test");
}

QUnit.test( "if_else (auto)", function() {
	if_else(null);
});

QUnit.test( "if_else (WebGL)", function() {
	if_else("webgl");
});

QUnit.test( "if_else (CPU)", function() {
	if_else("cpu");
});
