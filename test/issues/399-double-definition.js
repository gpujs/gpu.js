(function() {
	function test(mode) {
		var gpu = new GPU({ mode: mode });
    const toTexture = gpu.createKernel(function(value) {
      return value[this.thread.x];
    }, {
      output: [2],
      outputToTexture: true,
      hardcodeConstants: true,
      outputImmutable: true
    });
    // basically it doesn't die, but builds all the way through to webGL
    QUnit.assert.equal(toTexture([0, 1]).constructor, GPU.Texture);
    gpu.destroy();
	}

	QUnit.test('Issue #399 - double definition (webgl)', function() {
		test('webgl')
	});

	QUnit.test('Issue #399 - double definition (webgl2)', function() {
		test('webgl2')
	});
})();