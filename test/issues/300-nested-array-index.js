(() => {
	const GPU = require('../../src/index');
	function test(mode) {
		const gpu1 = new GPU({ mode });
		const gpu2 = new GPU({ mode });

		// these 2 should be equivalent
		const broken = gpu1.createKernel(function(input, lookup) {
			return lookup[input[this.thread.x]];
		})
			.setOutput([1]);

		const working = gpu2.createKernel(function(input, lookup) {
			const idx = input[this.thread.x];
			return lookup[idx];
		})
			.setOutput([1]);

		QUnit.assert.equal(broken([2], [7, 13, 19, 23])[0], 19);
		QUnit.assert.equal(working([2], [7, 13, 19, 23])[0], 19);

		gpu1.destroy();
		gpu2.destroy();
	}

	QUnit.test('Issue #300 nested array index - auto', () => {
		test();
	});

	QUnit.test('Issue #300 nested array index - gpu', () => {
		test('gpu');
	});

	(GPU.isWebGLSupported ? QUnit.test : QUnit.skip)('Issue #300 nested array index - webgl', () => {
		test('webgl');
	});

	(GPU.isWebGL2Supported ? QUnit.test : QUnit.skip)('Issue #300 nested array index - webgl2', () => {
		test('webgl2');
	});

	(GPU.isHeadlessGLSupported ? QUnit.test : QUnit.skip)('Issue #300 nested array index - headlessgl', () => {
		test('headlessgl');
	});

	QUnit.test('Issue #300 nested array index - cpu', () => {
		test('cpu');
	});
})();
