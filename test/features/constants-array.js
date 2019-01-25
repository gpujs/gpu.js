var GPU = require('../../src/index');

(function() {
  function arrayConstantTest(mode) {
    var gpu = new GPU({ mode: mode });
    var array = [200, 200];
    var tryConst = gpu.createKernel(
      function() {
        return this.constants.array[this.thread.x];
      },
      {
        constants: { array }
      }
    ).setOutput([2]);
    var result = tryConst();
    var match = new Float32Array([200, 200]);
    var test = (result[0] === match[0] && result[1] === match[1]);
    QUnit.assert.ok(test, 'array constant passed test');
    gpu.destroy();
  }

  QUnit.test('arrayConstantTest (auto)', function() {
    arrayConstantTest(null);
  });

  QUnit.test('arrayConstantTest (gpu)', function() {
    arrayConstantTest('gpu');
  });

  (GPU.isWebGLSupported ? QUnit.test : QUnit.skip)('arrayConstantTest (webgl)', function () {
    arrayConstantTest('webgl');
  });

  (GPU.isWebGL2Supported ? QUnit.test : QUnit.skip)('arrayConstantTest (webgl2)', function () {
    arrayConstantTest('webgl2');
  });

  (GPU.isHeadlessGLSupported ? QUnit.test : QUnit.skip)('arrayConstantTest (headless)', function () {
    arrayConstantTest('headlessgl');
  });

  QUnit.test('arrayConstantTest (cpu)', function() {
    arrayConstantTest('cpu');
  });
})();
