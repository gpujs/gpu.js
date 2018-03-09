(function() {
  function getValue(mode) {
    var gpu = new GPU({ mode: mode });

    const kernel = gpu.createKernel(function() {
      return getPi();
    })
      .setOutput([1])
      .setConstants({ pi: Math.PI });

    gpu.addFunction(function getPi() {
      return this.constants.pi;
    });

    return kernel();
  }

  QUnit.test( "Issue #130 - missing constant (cpu)", function() {
    var value = getValue('cpu');
    QUnit.assert.equal((value[0]).toFixed(7), Math.PI.toFixed(7));
  });

  QUnit.test( "Issue #130 - missing constant (auto)", function() {
    var value = getValue(null);
    QUnit.assert.equal((value[0]).toFixed(7), Math.PI.toFixed(7));
  });

  QUnit.test( "Issue #130 - missing constant (gpu)", function() {
    var value = getValue('gpu');
    QUnit.assert.equal((value[0]).toFixed(7), Math.PI.toFixed(7));
  });

  QUnit.test( "Issue #130 - missing constant (webgl)", function() {
    var value = getValue('webgl');
    QUnit.assert.equal((value[0]).toFixed(7), Math.PI.toFixed(7));
  });

  QUnit.test( "Issue #130 - missing constant (webgl2)", function() {
    var value = getValue('webgl2');
    QUnit.assert.equal((value[0]).toFixed(7), Math.PI.toFixed(7));
  });
})();