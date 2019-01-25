(function() {
  const GPU = require('../../src/index');

  function test(mode) {
    const gpu = new GPU({ mode: mode });

    const kernel = gpu.createKernel(function() {
      let sum = 0;
      for (let i = 0; i < 2; i++) {
        sum += i;
      }
      return sum;
    })
      .setOutput([1, 1]);

    const result = kernel();
    QUnit.assert.equal(result.length, 1);
    QUnit.assert.equal(result[0], 1);
    gpu.destroy();
  }

  QUnit.test('Issue #152 - for vars (cpu)', function() {
    test('cpu');
  });

  QUnit.test('Issue #152 - for vars (auto)', function() {
    test('gpu');
  });

  QUnit.test('Issue #152 - for vars (gpu)', function() {
    test('gpu');
  });

  (GPU.isWebGLSupported ? QUnit.test : QUnit.skip)('Issue #152 - for vars (webgl)', function() {
    test('webgl');
  });

  (GPU.isWebGL2Supported ? QUnit.test : QUnit.skip)('Issue #152 - for vars (webgl2)', function() {
    test('webgl2');
  });

  (GPU.isHeadlessGLSupported ? QUnit.test : QUnit.skip)('Issue #152 - for vars (webgl2)', function() {
    test('headlessgl');
  });
})();
