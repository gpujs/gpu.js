QUnit.test( "Issue #96 - param names (GPU only)", function() {
  const A = [
    [1, 1],
    [1, 1],
    [1, 1]
  ];

  const B = [
    [1, 1, 1],
    [1, 1, 1]
  ];

  const gpu = new GPU();

  function multiply(m, n, y, x) {
    var sum = 0;
    for (var i = 0; i < 2; i++) {
      sum += m[y][i] * n[i][x];
    }
    return sum;
  }

  var kernels = gpu.createKernels({
    multiplyResult: multiply
  }, function (a, b) {
    return multiply(b, a, this.thread.y, this.thread.x);
  })
    .setDimensions([B.length, A.length]);

  const result = kernels(A, B).result;
  QUnit.assert.deepEqual(QUnit.extend([], result[0]), [2,2]);
  QUnit.assert.deepEqual(QUnit.extend([], result[1]), [2,2]);
  QUnit.assert.deepEqual(QUnit.extend([], result[2]), [0,0]);
});