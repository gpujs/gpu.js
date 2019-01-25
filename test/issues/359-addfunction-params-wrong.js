var GPU = require('../../src/index');

(function() {
	function testAddFunctionKernel(mode) {
		var gpu = new GPU({mode});

		gpu.addFunction(function clcC(xx) {
			return Math.abs(xx);
		});

		gpu.addFunction(function itermediate(c1) {
			return clcC(c1);
		});

		const nestFunctionsKernel = gpu.createKernel(function() {
			return itermediate(-1);
		}, {
			output: [1]
		});

		QUnit.assert.equal(nestFunctionsKernel()[0], 1);

		gpu.destroy();
	}

	(GPU.isWebGLSupported ? QUnit.test : QUnit.skip)('Issue #359 - addFunction calls addFunction issue (webgl)', function() {
		testAddFunctionKernel('webgl')
	});

	(GPU.isWebGL2Supported ? QUnit.test : QUnit.skip)('Issue #359 - addFunction calls addFunction issue (webgl2)', function() {
		testAddFunctionKernel('webgl2')
	});

	(GPU.isHeadlessGLSupported ? QUnit.test : QUnit.skip)('Issue #359 - addFunction calls addFunction issue (headlessgl)', function() {
		testAddFunctionKernel('headlessgl')
	});
})();
