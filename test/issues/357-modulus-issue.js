(function() {
	function testModKernel(mode) {
		var gpu = new GPU({mode});
		var nValues = 100;

		var myFunc3 = gpu.createKernel(function(x) {
			return x[this.thread.x % 3];
		}).setOutput([nValues]);
		
		var input = [1, 2, 3];
		myFunc3(input); 
	
		var expected = new Float32Array(nValues);
		for (var i = 0; i < nValues; i++) {
			expected[i] = input[i % 3];
		}
		QUnit.assert.deepEqual(myFunc3([1, 2, 3]), expected);
		// QUnit.assert.ok()
		gpu.destroy();
	}

	QUnit.test('Issue #357 - modulus issue (webgl)', function() {
		testModKernel('webgl')
	});

	QUnit.test('Issue #357 - modulus issue (webgl2)', function() {
		testModKernel('webgl2')
	})
})();