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

  QUnit.test( 'floatConstantTest (auto)', function() {
    floatConstantTest(null);
  });

  QUnit.test( 'floatConstantTest (gpu)', function() {
    floatConstantTest('gpu');
  });

  if (GPU.isWebGlSupported()) {
    QUnit.test('floatConstantTest (webgl)', function () {
      floatConstantTest('webgl');
    });
  }

  if (GPU.isWebGl2Supported()) {
    QUnit.test('floatConstantTest (webgl2)', function () {
      floatConstantTest('webgl2');
    });
  }

  if (GPU.isHeadlessGlSupported()) {
    QUnit.test('floatConstantTest (headlessgl)', function () {
      floatConstantTest('headlessgl');
    });
  }

  QUnit.test( 'floatConstantTest (cpu)', function() {
    floatConstantTest('cpu');
  });
})();
