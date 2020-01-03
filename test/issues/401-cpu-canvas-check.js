const { assert, skip, test, module: describe } = require('qunit');
const { GPU, CPUKernel } = require('../../src');

describe('issue #401');

test('Issue #401 - cpu no canvas graphical', function(assert) {
  assert.throws(function() {
    CPUKernel.prototype.build.apply({
      setupConstants: function() {},
      setupArguments: function() {},
      validateSettings: function() {},
      getKernelString: function() {},
      translateSource: function() {},
      buildSignature: function() {},
      graphical: true,
      output: [1],
      canvas: null
    }, []);
  },
    new Error('no canvas available for using graphical output'),
    'throws when canvas is not available and using graphical output');
});

test('Issue #401 - cpu no canvas', function(assert) {
  CPUKernel.prototype.build.apply({
    setupConstants: function() {},
    setupArguments: function() {},
    validateSettings: function() {},
    getKernelString: function() {},
    translateSource: function() {},
    buildSignature: function() {},
    graphical: false,
    output: [1],
    canvas: null
  }, []);
  assert.equal(true, true, 'ok when canvas is not available and not using graphical output');
});
