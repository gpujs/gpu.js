(function () {
  function getResult(mode) {
    var A = [
      [1, 2],
      [3, 4],
      [5, 6]
    ];

    var B = [
      [6, 5, 4],
      [3, 2, 1]
    ];

    var gpu = new GPU({ mode: mode });

    function multiply(b, a, y, x) {
      var sum = 0;
      for (var i = 0; i < 2; i++) {
        sum += b[y][i] * a[i][x];
      }
      return sum;
    }

    var kernels = gpu.createKernelMap({
      multiplyResult: multiply
    }, function (a, b) {
      return multiply(b, a, this.thread.y, this.thread.x);
    })
      .setOutput([2, 2]);
    var result = kernels(A, B).result;
    gpu.destroy();
    return result;
  }
  QUnit.test( "Issue #91 - type detection (auto)", function() {
    var result = getResult();
    QUnit.assert.deepEqual(QUnit.extend([], result[0]), [21,32]);
    QUnit.assert.deepEqual(QUnit.extend([], result[1]), [9,14]);
  });
  QUnit.test( "Issue #91 - type detection (gpu)", function() {
    var result = getResult('gpu');
    QUnit.assert.deepEqual(QUnit.extend([], result[0]), [21,32]);
    QUnit.assert.deepEqual(QUnit.extend([], result[1]), [9,14]);
  });
  QUnit.test( "Issue #91 - type detection (webgl)", function() {
    var result = getResult('webgl');
    QUnit.assert.deepEqual(QUnit.extend([], result[0]), [21,32]);
    QUnit.assert.deepEqual(QUnit.extend([], result[1]), [9,14]);
  });
  QUnit.test( "Issue #91 - type detection (webgl2)", function() {
    var result = getResult('webgl2');
    QUnit.assert.deepEqual(QUnit.extend([], result[0]), [21,32]);
    QUnit.assert.deepEqual(QUnit.extend([], result[1]), [9,14]);
  });
  QUnit.test( "Issue #91 - type detection (cpu)", function() {
    var result = getResult('cpu');
    console.log(result);
    QUnit.assert.deepEqual(QUnit.extend([], result[0]), [21,32]);
    QUnit.assert.deepEqual(QUnit.extend([], result[1]), [9,14]);
  });
})();