(function() {
  var gpu;
  function buildAtan2KernelResult(mode) {
    gpu = new GPU({ mode });
    var kernel = gpu.createKernel(function() {
      return Math.atan2(1, 2);
    }, {
      output: [1]
    });
    return kernel();
  }

  QUnit.test('Issue #259 atan2 - (auto)', () => {
    QUnit.assert.equal(buildAtan2KernelResult()[0].toFixed(7), 0.4636476);
    gpu.destroy();
  });

  QUnit.test('Issue #259 atan2 - (gpu)', () => {
    QUnit.assert.equal(buildAtan2KernelResult('gpu')[0].toFixed(7), 0.4636476);
    gpu.destroy();
  });

  QUnit.test('Issue #259 atan2 - (webgl)', () => {
    QUnit.assert.equal(buildAtan2KernelResult('webgl')[0].toFixed(7), 0.4636476);
    gpu.destroy();
  });

  QUnit.test('Issue #259 atan2 - (webgl2)', () => {
    QUnit.assert.equal(buildAtan2KernelResult('webgl2')[0].toFixed(7), 0.4636476);
    gpu.destroy();
  });

  QUnit.test('Issue #259 atan2 - (cpu)', () => {
    QUnit.assert.equal(buildAtan2KernelResult('cpu')[0].toFixed(7), 0.4636476);
    gpu.destroy();
  });
})();
