(() => {
  const GPU = require('../../src/index');

  function test(mode) {
    const lst = [1, 2, 3, 4, 5, 6, 7];
    const gpu = new GPU({ mode });
    const kernels = gpu.createKernelMap({
      stepA: function (x) {
        return x * x;
      },
      stepB: function (x) {
        return x + 1;
      }
    }, function (lst) {
      const val = lst[this.thread.x];

      stepA(val);
      stepB(val);

      return val;
    })
      .setFloatOutput(true)
      .setOutput([lst.length]);

    const result = kernels(lst);
    const unwrap = gpu.createKernel(function(x) {
      return x[this.thread.x];
    })
      .setFloatTextures(true)
      .setOutput([lst.length]);

    const stepAResult = unwrap(result.stepA);
    const stepBResult = unwrap(result.stepB);

    QUnit.assert.deepEqual(QUnit.extend([], stepAResult), lst.map(function (x) { return x * x }));
    QUnit.assert.deepEqual(QUnit.extend([], stepBResult), lst.map(function (x) { return x + 1 }));
    QUnit.assert.deepEqual(QUnit.extend([], result.result), lst);
    gpu.destroy();
  }

  QUnit.test('Issue #233 - kernel map with float output (auto)', function() {
    test();
  });

  QUnit.test('Issue #233 - kernel map with float output (gpu)', function() {
    test('gpu');
  });

  (GPU.isWebGLSupported ? QUnit.test : QUnit.skip)('Issue #233 - kernel map with float output (webgl)', function() {
    test('webgl');
  });

  (GPU.isWebGL2Supported ? QUnit.test : QUnit.skip)('Issue #233 - kernel map with float output (webgl2)', function() {
    test('webgl2');
  });

  (GPU.isHeadlessGLSupported ? QUnit.test : QUnit.skip)('Issue #233 - kernel map with float output (headlessgl)', function() {
    test('headlessgl');
  });

  QUnit.test('Issue #233 - kernel map with float output (cpu)', function() {
    test('cpu');
  });
})();
