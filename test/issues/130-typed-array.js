(function() {
  function typedArrayTest(mode) {
    const gpu = new GPU({ mode });
    const kernel = gpu.createKernel(function(changes) {
      return changes[this.thread.y][this.thread.x];
    })
      .setOutput([2, 1]);

    const values = [new Float32Array(2)];
    values[0][0] = 0;
    values[0][1] = 0;
    const result = kernel(values);
    QUnit.assert.equal(result[0][0], 0);
    QUnit.assert.equal(result[0][1], 0);
    gpu.destroy();
  }

  QUnit.test( "Issue #130 - typed array (cpu)", function() {
    typedArrayTest('cpu');
  });

  QUnit.test( "Issue #130 - typed array (auto)", function() {
    typedArrayTest(null);
  });

  QUnit.test( "Issue #130 - typed array (gpu)", function() {
    typedArrayTest('gpu');
  });

  QUnit.test( "Issue #130 - typed array (webgl)", function() {
    typedArrayTest('webgl');
  });

  QUnit.test( "Issue #130 - typed array (webgl2)", function() {
    typedArrayTest('webgl2');
  });
})();