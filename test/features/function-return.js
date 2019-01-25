(function() {
  const GPU = require('../../src/index');
  function functionReturn( mode ) {
    var gpu = new GPU({ mode: mode });
    var f = gpu.createKernel(function() {
      return 42.0;
    }, {
      output : [1]
    });
    QUnit.assert.ok( f !== null, "function generated test");
    QUnit.assert.equal(f()[0], 42.0, "basic return function test");
    gpu.destroy();
  }

  QUnit.test("functionReturn (auto)", () => {
    functionReturn(null);
  });

  QUnit.test("functionReturn (gpu)", () => {
    functionReturn("gpu");
  });

  (GPU.isWebGLSupported ? QUnit.test : QUnit.skip)("functionReturn (webgl)", () => {
    functionReturn("webgl");
  });

  (GPU.isWebGL2Supported ? QUnit.test : QUnit.skip)("functionReturn (webgl2)", () => {
    functionReturn("webgl2");
  });

  (GPU.isHeadlessGLSupported ? QUnit.test : QUnit.skip)("functionReturn (headlessgl)", () => {
    functionReturn("headlessgl");
  });

  QUnit.test("functionReturn (CPU)", () => {
    functionReturn("cpu");
  });
})();
