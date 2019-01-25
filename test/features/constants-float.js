var GPU = require('../../src/index');

(function() {
  function floatConstantTest(mode) {
    var gpu = new GPU({ mode: mode });
    var float = 200.01;
    var tryConst = gpu.createKernel(
      function() {
        return this.constants.float;
      },
      {
        constants: { float }
      }
    ).setOutput([2]);
    var result = tryConst();
    var match = new Float32Array([200.01, 200.01]);
    var test = (
      result[0].toFixed(1) === match[0].toFixed(1)
      && result[1].toFixed(1) === match[1].toFixed(1)
    );
    QUnit.assert.ok(test, 'float constant passed test');
    gpu.destroy();
  }

  QUnit.test('floatConstantTest (auto)', function() {
    floatConstantTest(null);
  });

  QUnit.test('floatConstantTest (gpu)', function() {
    floatConstantTest('gpu');
  });

  (GPU.isWebGLSupported ? QUnit.test : QUnit.skip)('floatConstantTest (webgl)', function () {
    floatConstantTest('webgl');
  });

  (GPU.isWebGL2Supported ? QUnit.test : QUnit.skip)('floatConstantTest (webgl2)', function () {
    floatConstantTest('webgl2');
  });

  (GPU.isHeadlessGLSupported ? QUnit.test : QUnit.skip)('floatConstantTest (headlessgl)', function () {
    floatConstantTest('headlessgl');
  });

  QUnit.test('floatConstantTest (cpu)', function() {
    floatConstantTest('cpu');
  });
})();
