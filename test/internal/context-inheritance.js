(() => {
  const GPU = require('../../src/index');
  (GPU.isWebGLSupported ? QUnit.test : QUnit.skip)('WebGL context inheritance (webgl)', function(assert) {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('webgl');
    const gpu = new GPU({ context: context });
    const simpleKernel = gpu.createKernel(function() {
        return 1 + 1;
    }, {
        output: [1]
    });
    assert.equal(simpleKernel()[0], 2);
    assert.equal(gpu.Kernel, GPU.WebGLKernel);
    assert.equal(simpleKernel.getContext(), context);
    gpu.destroy();
  });
  (GPU.isWebGL2Supported ? QUnit.test : QUnit.skip)('WebGL context inheritance (webgl2)', function(assert) {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('webgl2');
    const gpu = new GPU({ context: context });
    const simpleKernel = gpu.createKernel(function() {
      return 1 + 1;
    }, {
      output: [1]
    });
    assert.equal(simpleKernel()[0], 2);
    assert.equal(gpu.Kernel, GPU.WebGL2Kernel);
    assert.equal(simpleKernel.getContext(), context);
    gpu.destroy();
  });
  (GPU.isHeadlessGLSupported ? QUnit.test : QUnit.skip)('WebGL context inheritance (headlessgl)', function(assert) {
    const context = require('gl')(1,1);
    const gpu = new GPU({ context: context });
    const simpleKernel = gpu.createKernel(function() {
      return 1 + 1;
    }, {
      output: [1]
    });
    assert.equal(simpleKernel()[0], 2);
    assert.equal(gpu.Kernel, GPU.HeadlessGLKernel);
    assert.equal(simpleKernel.getContext(), context);
    gpu.destroy();
  });
})();
