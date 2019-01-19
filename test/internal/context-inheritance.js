var GPU = require('../../src/index');

(function() {
  (GPU.isWebGlSupported() ? QUnit.test : QUnit.skip)('WebGL context inheritance (webgl)', function(assert) {
    var canvas = document.createElement('canvas');
    var webGl = canvas.getContext('webgl');
    var gpu = new GPU({ webGl: webGl });
    var simpleKernel = gpu.createKernel(function() {
        return 1 + 1;
    }, {
        output: [1]
    });
    assert.equal(simpleKernel()[0], 2);
    assert.equal(gpu._runner.constructor, GPU.WebGLRunner);
    assert.equal(simpleKernel.getWebGl(), webGl);
    gpu.destroy();
  });
  (GPU.isWebGl2Supported() ? QUnit.test : QUnit.skip)('WebGL context inheritance (webgl2)', function(assert) {
    var canvas = document.createElement('canvas');
    var webGl = canvas.getContext('webgl2');
    var gpu = new GPU({ webGl: webGl });
    var simpleKernel = gpu.createKernel(function() {
      return 1 + 1;
    }, {
      output: [1]
    });
    assert.equal(simpleKernel()[0], 2);
    assert.equal(gpu._runner.constructor, GPU.WebGL2Runner);
    assert.equal(simpleKernel.getWebGl(), webGl);
    gpu.destroy();
  });
  (GPU.isHeadlessGlSupported() ? QUnit.test : QUnit.skip)('WebGL context inheritance (headlessgl)', function(assert) {
    var webGl = require('gl')(1,1);
    var gpu = new GPU({ webGl: webGl });
    var simpleKernel = gpu.createKernel(function() {
      return 1 + 1;
    }, {
      output: [1]
    });
    assert.equal(simpleKernel()[0], 2);
    assert.equal(gpu._runner.constructor, GPU.HeadlessGLRunner);
    assert.equal(simpleKernel.getWebGl(), webGl);
    gpu.destroy();
  });
})();
