(function() {
  function floatOutputKernel(output, mode) {
    var gpu = new GPU({ mode: mode });

    return gpu.createKernel(function(lst) {
      return lst[this.thread.x];
    })
      .setFloatOutput(true)
      .setOutput(output);
  }

  QUnit.test( "floatOutput (GPU only) (auto)", function() {
    var lst = [1, 2, 3, 4, 5, 6, 7];
    var result = floatOutputKernel([lst.length], null)(lst);
    QUnit.assert.deepEqual(QUnit.extend([], result), lst);
  });

  QUnit.test( "floatOutput (GPU only) (gpu)", function() {
    var lst = [1, 2, 3, 4, 5, 6, 7];
    var result = floatOutputKernel([lst.length], 'gpu')(lst);
    QUnit.assert.deepEqual(QUnit.extend([], result), lst);
  });

  QUnit.test( "floatOutput (GPU only) (webgl)", function() {
    var lst = [1, 2, 3, 4, 5, 6, 7];
    var result = floatOutputKernel([lst.length], 'webgl')(lst);
    QUnit.assert.deepEqual(QUnit.extend([], result), lst);
  });

  QUnit.test( "floatOutput (GPU only) (webgl2)", function() {
    var lst = [1, 2, 3, 4, 5, 6, 7];
    var result = floatOutputKernel([lst.length], 'webgl2')(lst);
    QUnit.assert.deepEqual(QUnit.extend([], result), lst);
  });
})();