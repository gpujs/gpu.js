(function() {

	var input = [[0, 1, 2], [3, 4, 5], [6, 7, 8]];

	// recursive!
	function manyKernels(mode, nKernels, assert, done) {
		done = done || assert.async();
		nKernels--;

		var gpu = new GPU({ mode });
		var kernel = gpu.createKernel(function(inp) {
			return inp[this.thread.y][this.thread.x];
		}, {
			output: [3, 3]
		});
		var kernel2 = gpu.createKernel(function() {
			return this.thread.y * this.thread.x;
		}, {
			output: [1024, 1024]
		}).setOutputToTexture(true);
		kernel(input);
		kernel2();
		if (kernel._webGl !== kernel2._webGl) {
			assert.ok(false, "webgls should be the same object")
		}
		var canvas = kernel.getCanvas();
		var eventListener = canvas.addEventListener('webglcontextlost', function(e) {
			canvas.removeEventListener('webglcontextlost', eventListener)
			if (nKernels == 0) {
				assert.ok(true)
				done()
			}
			else {
				manyKernels(mode, nKernels, assert, done);
			}

			}, true);

		gpu.destroy();
	}
	
	QUnit.test('Issue #174 - webgl context leak (webgl)', function(assert) {
		manyKernels('webgl', 10, assert);
	});
	
	QUnit.test('Issue #174 - webgl context leak (webgl2)', function(assert) {
		manyKernels('webgl2', 10, assert);
	});
})()