var GPU = require('../../src/index');

(function() {
	QUnit.test('Issue #401 - cpu no canvas graphical', function(assert) {
		assert.throws(function() {
			GPU.CPUKernel.prototype.build.apply({
        setupConstants: function() {},
				setupArguments: function() {},
        validateSettings: function() {},
        getKernelString: function() {},
        graphical: true,
				output: [1],
				canvas: null
			}, []);
		},
			new Error('no canvas available for using graphical output'),
			'throws when canvas is not available and using graphical output');
	});

  QUnit.test('Issue #401 - cpu no canvas', function(assert) {
		GPU.CPUKernel.prototype.build.apply({
			setupConstants: function() {},
			setupArguments: function() {},
			validateSettings: function() {},
      getKernelString: function() {},
			graphical: false,
			output: [1],
			canvas: null
		}, []);
		assert.equal(true, true, 'ok when canvas is not available and not using graphical output');
	});
})();
