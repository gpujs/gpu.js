(function() {
	const GPU = require('../../src/index');
	function testModKernel(mode) {
		const gpu = new GPU({mode});
		const nValues = 100;

		const myFunc3 = gpu.createKernel(function(x) {
			return x[this.thread.x % 3];
		}).setOutput([nValues]);

		const input = [1, 2, 3];
		myFunc3(input);

		const expected = new Float32Array(nValues);
		for (let i = 0; i < nValues; i++) {
			expected[i] = input[i % 3];
		}
		QUnit.assert.deepEqual(myFunc3([1, 2, 3]), expected);
		gpu.destroy();
	}

	(GPU.isWebGLSupported ? QUnit.test : QUnit.skip)('Issue #357 - modulus issue (webgl)', () => {
		testModKernel('webgl');
	});

	(GPU.isWebGL2Supported ? QUnit.test : QUnit.skip)('Issue #357 - modulus issue (webgl2)', () => {
		testModKernel('webgl2');
	});

	(GPU.isHeadlessGLSupported ? QUnit.test : QUnit.skip)('Issue #357 - modulus issue (headlessgl)', () => {
		testModKernel('headlessgl');
	});
})();
