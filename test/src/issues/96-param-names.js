function paramNames(mode) {
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

  function multiply(m, n, y, x) {
    var sum = 0;
    for (var i = 0; i < 3; i++) {
      sum += m[y][i] * n[i][x];
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
  QUnit.assert.deepEqual(QUnit.extend([], result[0]), [3,3]);
  QUnit.assert.deepEqual(QUnit.extend([], result[1]), [3,3]);
}

QUnit.test( "Issue #96 - param names (auto)", function() {
  paramNames();
});
QUnit.test( "Issue #96 - param names (gpu)", function() {
  paramNames('gpu');
});
QUnit.test( "Issue #96 - param names (cpu)", function() {
  paramNames('cpu');
});