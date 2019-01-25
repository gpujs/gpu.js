var GPU = require('../../src/index');

(function() {
  var lst = new Float32Array([1, 2, 3, 4, 5, 6, 7, 8]);
  var gpu;
  function floatOutputKernel(output, mode) {
    gpu = new GPU({ mode: mode });
    return gpu.createKernel(function(lst) {
      return lst[this.thread.x];
    })
      .setFloatTextures(true)
      .setOutput(output);
  }

  QUnit.test("floatTextures (auto)", function() {
    var result = floatOutputKernel([lst.length], null)(lst);
    QUnit.assert.deepEqual(result, lst);
    gpu.destroy();
  });

  QUnit.test("floatOutput (cpu)", function() {
    var result = floatOutputKernel([lst.length], 'cpu')(lst);
    QUnit.assert.deepEqual(result, lst);
    gpu.destroy();
  });

  QUnit.test("floatOutput (gpu)", function() {
    var result = floatOutputKernel([lst.length], 'gpu')(lst);
    QUnit.assert.deepEqual(result, lst);
    gpu.destroy();
  });

  (GPU.isWebGLSupported ? QUnit.test : QUnit.skip)("floatOutput (webgl)", function () {
    var result = floatOutputKernel([lst.length], 'webgl')(lst);
    QUnit.assert.deepEqual(result, lst);
    gpu.destroy();
  });

  (GPU.isWebGL2Supported ? QUnit.test : QUnit.skip)("floatOutput (webgl2)", function () {
    var result = floatOutputKernel([lst.length], 'webgl2')(lst);
    QUnit.assert.deepEqual(result, lst);
    gpu.destroy();
  });

  (GPU.isHeadlessGLSupported ? QUnit.test : QUnit.skip)("floatOutput (headlessgl)", function () {
    var result = floatOutputKernel([lst.length], 'headlessgl')(lst);
    QUnit.assert.deepEqual(result, lst);
    gpu.destroy();
  });
})();

(function() {
  var lst = new Float32Array([1, 2, 3, 4, 5, 6, 7, 8]);
  var gpu;
  function floatOutputKernel(output, mode) {
    gpu = new GPU({ mode: mode });
    return gpu.createKernel(function(lst) {
      return lst[this.thread.x];
    })
      .setFloatOutput(true)
      .setOutput(output);
  }

  QUnit.test("floatOutput (auto)", function() {
    var result = floatOutputKernel([lst.length], null)(lst);
    QUnit.assert.deepEqual(result, lst);
    gpu.destroy();
  });

  QUnit.test("floatOutput (cpu)", function() {
    var result = floatOutputKernel([lst.length], 'cpu')(lst);
    QUnit.assert.deepEqual(result, lst);
    gpu.destroy();
  });

  QUnit.test("floatOutput (gpu)", function() {
    var result = floatOutputKernel([lst.length], 'gpu')(lst);
    QUnit.assert.deepEqual(result, lst);
    gpu.destroy();
  });

  (GPU.isWebGLSupported ? QUnit.test : QUnit.skip)("floatOutput (webgl)", function () {
    var result = floatOutputKernel([lst.length], 'webgl')(lst);
    QUnit.assert.deepEqual(result, lst);
    gpu.destroy();
  });

  (GPU.isWebGL2Supported ? QUnit.test : QUnit.skip)("floatOutput (webgl2)", function () {
    var result = floatOutputKernel([lst.length], 'webgl2')(lst);
    QUnit.assert.deepEqual(result, lst);
    gpu.destroy();
  });

  (GPU.isHeadlessGLSupported ? QUnit.test : QUnit.skip)("floatOutput (headlessgl)", function () {
    var result = floatOutputKernel([lst.length], 'headlessgl')(lst);
    QUnit.assert.deepEqual(result, lst);
    gpu.destroy();
  });
})();
