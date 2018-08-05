(function() {
  var lst = new Float32Array([1, 2, 3, 4, 5, 6, 7, 8]);
  var gpu;
  function floatOutputKernel(output, mode) {
    gpu = new GPU({ mode: mode });
    return gpu.createKernel(function(lst) {
      return lst[this.thread.x];
    })
      .setFloatOutput(true)
      .setOutput(output);
  }

  QUnit.test( "floatOutput (auto)", function() {
    var result = floatOutputKernel([lst.length], null)(lst);
    QUnit.assert.deepEqual(result, lst);
    gpu.destroy();
  });
  
  QUnit.test( "floatOutput (cpu)", function() {
    var result = floatOutputKernel([lst.length], 'cpu')(lst);
    QUnit.assert.deepEqual(result, lst);
    gpu.destroy();
  });

  QUnit.test( "floatOutput (gpu)", function() {
    var result = floatOutputKernel([lst.length], 'gpu')(lst);
    QUnit.assert.deepEqual(result, lst);
    gpu.destroy();
  });

  QUnit.test( "floatOutput (webgl)", function() {
    var result = floatOutputKernel([lst.length], 'webgl')(lst);
    QUnit.assert.deepEqual(result, lst);
    gpu.destroy();
  });

  QUnit.test( "floatOutput (webgl2)", function() {
    var result = floatOutputKernel([lst.length], 'webgl2')(lst);
    QUnit.assert.deepEqual(result, lst);
    gpu.destroy();
  });
})();