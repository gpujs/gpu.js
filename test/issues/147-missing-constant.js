var GPU = require('../../src/index');

(function() {
  function test(mode) {
    const gpu = new GPU({ mode: mode });
    function getPi() {
      return this.constants.pi;
    }

    const kernel = gpu.createKernel(function() {
      return getPi();
    })
      .setOutput([1])
      .setConstants({ pi: Math.PI });

    gpu.addFunction(getPi);

    const result = kernel();
    QUnit.assert.equal(result[0].toFixed(7), Math.PI.toFixed(7));
    gpu.destroy();
  }

  QUnit.test("Issue #147 - missing constant (auto)", () => {
    test(null);
  });

  QUnit.test("Issue #147 - missing constant (gpu)", () => {
    test('gpu');
  });

  (GPU.isWebGLSupported ? QUnit.test : QUnit.skip)("Issue #147 - missing constant (webgl)", () => {
    test('webgl');
  });

  (GPU.isWebGL2Supported ? QUnit.test : QUnit.skip)("Issue #147 - missing constant (webgl2)", () => {
    test('webgl2');
  });

  (GPU.isHeadlessGLSupported ? QUnit.test : QUnit.skip)("Issue #147 - missing constant (headlessgl)", () => {
    test('headlessgl');
  });

  QUnit.test("Issue #147 - missing constant (cpu)", () => {
    test('cpu');
  });
})();
