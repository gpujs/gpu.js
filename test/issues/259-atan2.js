(function() {
  const GPU = require('../../src/index');

  function buildAtan2KernelResult(mode) {
    const gpu = new GPU({ mode });
    const kernel = gpu.createKernel(function() {
      return Math.atan2(1, 2);
    }, {
      output: [1]
    });
    QUnit.assert.equal(kernel()[0].toFixed(7), 0.4636476);
    gpu.destroy();
  }

  QUnit.test('Issue #259 atan2 - (auto)', () => {
    buildAtan2KernelResult();
  });

  QUnit.test('Issue #259 atan2 - (gpu)', () => {
    buildAtan2KernelResult('gpu');
  });

  (GPU.isWebGLSupported ? QUnit.test : QUnit.skip)('Issue #259 atan2 - (webgl)', () => {
    buildAtan2KernelResult('webgl');
  });

  (GPU.isWebGL2Supported ? QUnit.test : QUnit.skip)('Issue #259 atan2 - (webgl2)', () => {
    buildAtan2KernelResult('webgl2');
  });

  (GPU.isHeadlessGLSupported ? QUnit.test : QUnit.skip)('Issue #259 atan2 - (headlessgl)', () => {
    buildAtan2KernelResult('headlessgl');
  });

  QUnit.test('Issue #259 atan2 - (cpu)', () => {
    buildAtan2KernelResult('cpu');
  });
})();
