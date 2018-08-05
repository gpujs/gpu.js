(function() {
  function getResult(mode) {

    var A = [
      [1, 1, 1],
      [1, 1, 1]
    ];

    var B = [
      [1, 1],
      [1, 1],
      [1, 1]
    ];

    var gpu = new GPU({ mode: mode });

    function multiply(m, n, y, x) {
      var sum = 0;
      for (var i = 0; i < 2; i++) {
        sum += m[y][i] * n[i][x];
      }
      return sum;
    }

    var kernels = gpu.createKernelMap({
      multiplyResult: multiply
    }, function (a, b) {
      return multiply(b, a, this.thread.y, this.thread.x);
    })
      .setOutput([B.length, A.length]);
    
    var result = kernels(A, B).result;
    gpu.destroy();
    return result;
  }
  QUnit.test( "Issue #96 - param names (auto)", function() {
    var result = getResult();
    QUnit.assert.deepEqual(QUnit.extend([], result[0]), [2,2,2]);
    QUnit.assert.deepEqual(QUnit.extend([], result[1]), [2,2,2]);
    QUnit.assert.deepEqual(QUnit.extend([], result[2]), []);
  });

  QUnit.test( "Issue #96 - param names (cpu)", function() {
    var result = getResult('cpu');
    QUnit.assert.deepEqual(QUnit.extend([], result[0]), [2,2,2]);
    QUnit.assert.deepEqual(QUnit.extend([], result[1]), [2,2,2]);
    QUnit.assert.deepEqual(QUnit.extend([], result[2]), []);
  });

  QUnit.test( "Issue #96 - param names (gpu)", function() {
    var result = getResult('gpu');
    QUnit.assert.deepEqual(QUnit.extend([], result[0]), [2,2,2]);
    QUnit.assert.deepEqual(QUnit.extend([], result[1]), [2,2,2]);
    QUnit.assert.deepEqual(QUnit.extend([], result[2]), []);
  });
  QUnit.test( "Issue #96 - param names (webgl)", function() {
    var result = getResult('webgl');
    QUnit.assert.deepEqual(QUnit.extend([], result[0]), [2,2,2]);
    QUnit.assert.deepEqual(QUnit.extend([], result[1]), [2,2,2]);
    QUnit.assert.deepEqual(QUnit.extend([], result[2]), []);
  });
  QUnit.test( "Issue #96 - param names (GPU only) (webgl2)", function() {
    var result = getResult('webgl2');
    QUnit.assert.deepEqual(QUnit.extend([], result[0]), [2,2,2]);
    QUnit.assert.deepEqual(QUnit.extend([], result[1]), [2,2,2]);
    QUnit.assert.deepEqual(QUnit.extend([], result[2]), []);
  });
})();