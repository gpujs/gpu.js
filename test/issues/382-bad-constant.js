(() => {
	const GPU = require('../../src/index');
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

	(GPU.isWebGLSupported ? QUnit.test : QUnit.skip)('Issue #382 - bad constant (webgl)', () => {
		testModKernel('webgl');
	});

	(GPU.isWebGL2Supported ? QUnit.test : QUnit.skip)('Issue #382 - bad constant (webgl2)', () => {
		testModKernel('webgl2');
	});

	(GPU.isHeadlessGLSupported ? QUnit.test : QUnit.skip)('Issue #382 - bad constant (headlessgl)', () => {
		testModKernel('headlessgl');
	});
})();
