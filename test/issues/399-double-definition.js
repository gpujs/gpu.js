(() => {
  const GPU = require('../../src/index');
	function test(mode) {
		const gpu = new GPU({ mode: mode });
    const toTexture = gpu.createKernel(function(value) {
      return value[this.thread.x];
    }, {
      debug: true,
      output: [2],
      outputToTexture: true,
      hardcodeConstants: true,
      outputImmutable: true
    });
    // basically it doesn't die, but builds all the way through to webGL
    QUnit.assert.equal(toTexture([0, 1]).constructor, GPU.Texture);
    gpu.destroy();
	}

  (GPU.isWebGLSupported ? QUnit.test : QUnit.skip)('Issue #399 - double definition (webgl)', () => {
		test('webgl')
	});

  (GPU.isWebGL2Supported ? QUnit.test : QUnit.skip)('Issue #399 - double definition (webgl2)', () => {
		test('webgl2')
	});

  (GPU.isHeadlessGLSupported ? QUnit.test : QUnit.skip)('Issue #399 - double definition (headlessgl)', () => {
    test('headlessgl')
  });
})();
