var GPU = require('../../src/index');
require('qunit-assert-close');

(function() {
  function functionReturn( mode ) {
    var gpu = new GPU({ mode: mode });
    var f = gpu.createKernel(function() {
      return 42.0;
    }, {
      output : [1]
    });
    QUnit.assert.ok( f !== null, "function generated test");
    QUnit.assert.close(f()[0], 42.0, 0.01, "basic return function test");
    gpu.destroy();
  }

  QUnit.test( "functionReturn (auto)", function() {
    functionReturn(null);
  });

  QUnit.test( "functionReturn (gpu)", function() {
    functionReturn("gpu");
  });

  (GPU.isWebGlSupported() ? QUnit.test : QUnit.skip)("functionReturn (webgl)", function () {
    functionReturn("webgl");
  });

  (GPU.isWebGl2Supported() ? QUnit.test : QUnit.skip)("functionReturn (webgl2)", function () {
    functionReturn("webgl2");
  });

  (GPU.isHeadlessGlSupported() ? QUnit.test : QUnit.skip)("functionReturn (headlessgl)", function () {
    functionReturn("headlessgl");
  });

  QUnit.test( "functionReturn (CPU)", function() {
    functionReturn("cpu");
  });
})();
