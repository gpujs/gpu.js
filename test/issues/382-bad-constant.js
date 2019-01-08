(function() {
	function testModKernel(mode) {
		var gpu = new GPU({ mode: mode });
    var conflictingName = 0.4;
		var kernel = gpu.createKernel(function(a, conflictingName) {
      return a[this.thread.x] + this.constants.conflictingName + conflictingName;
    })
			.setOutput([1])
			.setConstants({
        conflictingName: conflictingName
			});

		var result = kernel([1], 0.6);

		QUnit.assert.equal(result[0], 2);
		gpu.destroy();
	}

	QUnit.test('Issue #382 - bad constant (webgl)', function() {
		testModKernel('webgl')
	});

	QUnit.test('Issue #382 - bad constant (webgl2)', function() {
		testModKernel('webgl2')
	});
})();