var GPU = require('../../src/index');

(function() {
  function integerConstantTest(mode) {
    var gpu = new GPU({ mode: mode });
    var int = 200;
    var tryConst = gpu.createKernel(
      function() {
        return this.constants.int;
      },
      {
        constants: { int }
      }
    ).setOutput([2]);
    var result = tryConst();
    var match = new Float32Array([200, 200]);
    var test = (result[0] === match[0] && result[1] === match[1]);
    QUnit.assert.ok(test, 'int constant passed test');
    gpu.destroy();
  }

  QUnit.test( 'integerConstantTest (auto)', function() {
    integerConstantTest(null);
  });

  QUnit.test( 'integerConstantTest (gpu)', function() {
    integerConstantTest('gpu');
  });

  if (GPU.isWebGlSupported()) {
    QUnit.test('integerConstantTest (webgl)', function () {
      integerConstantTest('webgl');
    });
  }

  if (GPU.isWebGl2Supported()) {
    QUnit.test('integerConstantTest (webgl2)', function () {
      integerConstantTest('webgl2');
    });
  }

  if (GPU.isHeadlessGlSupported()) {
    QUnit.test('integerConstantTest (headlessgl)', function () {
      integerConstantTest('headlessgl');
    });
  }

  QUnit.test( 'integerConstantTest (cpu)', function() {
    integerConstantTest('cpu');
  });
})();
