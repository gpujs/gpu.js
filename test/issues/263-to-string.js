(function() {
  var gpu;
  function buildToStringKernelResult(mode) {
    gpu = new GPU({ mode });
    var kernel = gpu.createKernel(function() {
      return 1;
    }, {
      output: [1]
    });
    kernel.build();
    var string = kernel.toString();
    var kernel2 = eval(string)();
    return kernel2
      .setWebGl(kernel._webGl)
      .setCanvas(kernel._canvas)();
  }

  QUnit.test('Issue #263 toString single function - (auto)', () => {
    QUnit.assert.equal(buildToStringKernelResult()[0], 1);
    gpu.destroy();
  });

  QUnit.test('Issue #263 toString single function - (gpu)', () => {
    QUnit.assert.equal(buildToStringKernelResult('gpu')[0], 1);
    gpu.destroy();
  });

  QUnit.test('Issue #263 toString single function - (webgl)', () => {
    QUnit.assert.equal(buildToStringKernelResult('webgl')[0], 1);
    gpu.destroy();
  });

  QUnit.test('Issue #263 toString single function - (webgl2)', () => {
    QUnit.assert.equal(buildToStringKernelResult('webgl2')[0], 1);
    gpu.destroy();
  });

  QUnit.test('Issue #263 toString single function - (cpu)', () => {
    QUnit.assert.equal(buildToStringKernelResult('cpu')[0], 1);
    gpu.destroy();
  });
})();
