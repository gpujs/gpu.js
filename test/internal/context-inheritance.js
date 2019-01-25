var GPU = require('../../src/index');

(function() {
  (GPU.isWebGLSupported ? QUnit.test : QUnit.skip)('WebGL context inheritance (webgl)', function(assert) {
    var canvas = document.createElement('canvas');
    var context = canvas.getContext('webgl');
    var gpu = new GPU({ context: context });
    var simpleKernel = gpu.createKernel(function() {
        return 1 + 1;
    }, {
        output: [1]
    });
    assert.equal(simpleKernel()[0], 2);
    assert.equal(gpu.runner.constructor, GPU.WebGLRunner);
    assert.equal(simpleKernel.getContext(), context);
    gpu.destroy();
  });
  (GPU.isWebGL2Supported ? QUnit.test : QUnit.skip)('WebGL context inheritance (webgl2)', function(assert) {
    var canvas = document.createElement('canvas');
    var context = canvas.getContext('webgl2');
    var gpu = new GPU({ context: context });
    var simpleKernel = gpu.createKernel(function() {
      return 1 + 1;
    }, {
      output: [1]
    });
    assert.equal(simpleKernel()[0], 2);
    assert.equal(gpu.runner.constructor, GPU.WebGL2Runner);
    assert.equal(simpleKernel.getContext(), context);
    gpu.destroy();
  });
  (GPU.isHeadlessGLSupported ? QUnit.test : QUnit.skip)('WebGL context inheritance (headlessgl)', function(assert) {
    var context = require('gl')(1,1);
    var gpu = new GPU({ context: context });
    var simpleKernel = gpu.createKernel(function() {
      return 1 + 1;
    }, {
      output: [1]
    });
    assert.equal(simpleKernel()[0], 2);
    assert.equal(gpu.runner.constructor, GPU.HeadlessGLRunner);
    assert.equal(simpleKernel.getContext(), context);
    gpu.destroy();
  });
})();
