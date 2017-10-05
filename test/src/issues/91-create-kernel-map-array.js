function typeDetection(mode) {
  var A = [
    [1, 1],
    [1, 1],
    [1, 1]
  ];

  var B = [
    [1, 1, 1],
    [1, 1, 1]
  ];

  var gpu = new GPU({ mode: mode });

  function multiply(b, a, y, x) {
    var sum = 0;
    for (var i = 0; i < 2; i++) {
      sum += b[x][i] * a[y][x];
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
  QUnit.assert.deepEqual(QUnit.extend([], result[0]), [2,2]);
  QUnit.assert.deepEqual(QUnit.extend([], result[1]), [2,2]);
  QUnit.assert.deepEqual(QUnit.extend([], result[2]), [2,2]);
}

QUnit.test( "Issue #91 - type detection (auto)", function() {
  typeDetection();
});
QUnit.test( "Issue #91 - type detection (gpu)", function() {
  typeDetection('gpu');
});
QUnit.test( "Issue #91 - type detection (cpu)", function() {
  typeDetection('cpu');
});