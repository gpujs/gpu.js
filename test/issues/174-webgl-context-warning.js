(function() {
	const GPU = require('../../src/index');
	const input = [[0, 1, 2], [3, 4, 5], [6, 7, 8]];

	// recursive!
	function manyKernels(mode, kernelCount, assert) {
		if (kernelCount < 1) return;
		const done = assert.async();
		kernelCount--;

		const gpu = new GPU({ mode });
		const kernel = gpu.createKernel(function(inp) {
			return inp[this.thread.y][this.thread.x];
		}, {
			output: [3, 3]
		});
		const kernel2 = gpu.createKernel(function() {
			return this.thread.y * this.thread.x;
		}, {
			output: [1024, 1024],
			outputToTexture: true
		});
		kernel(input);
		kernel2();
		QUnit.assert.strictEqual(kernel.context, kernel2.context, "contexts should be the same object");
		manyKernels(mode, kernelCount, assert, done);
		const canvas = kernel.getCanvas();
		const eventListener = canvas.addEventListener('webglcontextlost', (e) => {
			canvas.removeEventListener('webglcontextlost', eventListener);
			done();
		});

		gpu.destroy();
	}

	(GPU.isWebGLSupported ? QUnit.test : QUnit.skip)('Issue #174 - webgl context leak (webgl)', (assert) => {
		manyKernels('webgl', 10, assert);
	});

	(GPU.isWebGL2Supported ? QUnit.test : QUnit.skip)('Issue #174 - webgl context leak (webgl2)', (assert) => {
		manyKernels('webgl2', 10, assert);
	});
})();
