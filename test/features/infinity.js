(function() {
  var gpu;
  function input(mode) {
    gpu = new GPU({ mode: mode || undefined });
    return gpu.createKernel(function() {
      return Infinity;
    })
      .setOutput([1])();
  }

  QUnit.test( "Infinity (auto)", function() {
    QUnit.assert.deepEqual(input()[0], NaN);
    gpu.destroy();
  });

  QUnit.test( "Infinity (cpu)", function() {
    QUnit.assert.deepEqual(input('cpu')[0], Infinity);
    gpu.destroy();
  });

  QUnit.test( "Infinity (gpu)", function() {
    QUnit.assert.deepEqual(input('gpu')[0], NaN);
    gpu.destroy();
  });

  QUnit.test( "Infinity (webgl)", function() {
    QUnit.assert.deepEqual(input('webgl')[0], NaN);
    gpu.destroy();
  });

  QUnit.test( "Infinity (webgl2)", function() {
    QUnit.assert.deepEqual(input('webgl2')[0], NaN);
    gpu.destroy();
  });
})();