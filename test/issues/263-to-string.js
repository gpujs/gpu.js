(function() {
  const GPU = require('../../src/index');
  function test(mode) {
    const gpu = new GPU({ mode });
    const kernel = gpu.createKernel(function() {
      return 1;
    }, {
      output: [1]
    });
    kernel.build();
    const string = kernel.toString();
    const kernel2 = eval(string)();
    const result = kernel2
      .setContext(kernel.context)
      .setCanvas(kernel.canvas)();

    QUnit.assert.equal(result[0], 1);
    gpu.destroy();
  }

  QUnit.test('Issue #263 toString single function - (auto)', () => {
    test();
  });

  QUnit.test('Issue #263 toString single function - (gpu)', () => {
    test('gpu');
  });

  (GPU.isWebGLSupported ? QUnit.test : QUnit.skip)('Issue #263 toString single function - (webgl)', () => {
    test('webgl');
  });

  (GPU.isWebGL2Supported ? QUnit.test : QUnit.skip)('Issue #263 toString single function - (webgl2)', () => {
    test('webgl2');
  });

  (GPU.isHeadlessGLSupported ? QUnit.test : QUnit.skip)('Issue #263 toString single function - (headlessgl)', () => {
    test('headlessgl');
  });

  QUnit.test('Issue #263 toString single function - (cpu)', () => {
    test('cpu');
  });
})();
