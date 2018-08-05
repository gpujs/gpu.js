
(function() {
	QUnit.test('Issue #349 - divide by three!!', function() {
		var gpu = new GPU({mode: null});
		var k = gpu.createKernel(function(v1, v2) {
			return v1 / v2;
		}).setOutput([1]).setFloatOutput(true)
		QUnit.assert.equal(k(6,3)[0], 2);
		gpu.destroy();
	});

	QUnit.test('Issue #349 - some random whole number divisions', function() {
		var DATA_MAX = 1024*1024;
		var dividendData = new Float32Array(DATA_MAX);
		var divisorData = new Float32Array(DATA_MAX);
		var expectedResults = new Float32Array(DATA_MAX);
		var maxWholeNumberRepresentation = Math.sqrt(16777217);
		for (var i = 0; i < DATA_MAX; i++) {
			divisorData[i] = parseInt(Math.random() * maxWholeNumberRepresentation + 1, 10);
			expectedResults[i] = parseInt(Math.random() * maxWholeNumberRepresentation + 1, 10);
			dividendData[i] = divisorData[i] * expectedResults[i];
		}
		var gpu = new GPU({mode: null});
		var k = gpu.createKernel(function(v1, v2) {
			return v1[this.thread.x] / v2[this.thread.x];
		}).setOutput([DATA_MAX])
			.setFloatOutput(true);
		var result = k(dividendData, divisorData);
		var same = true;
		for (var i = 0; i < DATA_MAX; i++) {
			if (result[i] !== expectedResults[i]) {
				same = false;
				break;
			}
		}
		QUnit.assert.ok(same, same ? "" : "not all elements are the same, failed on index:" + i + " " + dividendData[i] + "/" + divisorData[i]);
		gpu.destroy();
	});

	QUnit.test('Issue #349 - test disable fix integer division bug', function() {
		var gpu = new GPU({mode: null});
		var idfix = gpu.createKernel(function(v1, v2) {
			return v1 / v2;
		}).setOutput([1]).setFloatOutput(true)

		var idfixoff = gpu.createKernel(function(v1, v2) {
			return v1 / v2;
		}).setOutput([1]).setFloatOutput(true).setFixIntegerDivisionAccuracy(false)

		var hasBug = gpu.hasIntegerDivisionAccuracyBug();
		QUnit.assert.ok(idfix(6,3)[0] == 2 && (!hasBug || idfixoff(6,3)[0] != 2), "should show bug!");
		gpu.destroy();
	});
})();

