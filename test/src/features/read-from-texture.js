QUnit.test( "Read from Texture", function() {

  const gpu = new GPU();

  const A = [1, 2, 3, 4, 5];
  const B = [1, 2, 3, 4, 5];
  
  function add(m, n) {
      return m + n;
  }

  const kernels = gpu.createKernelMap({
    addResult: add
  }, function (a, b) {
    return add(a[this.thread.x], b[this.thread.x]);
  }).setOutput([A.length]);

  const result = kernels(A, B);
  const textureResult = result.addResult;

  QUnit.assert.deepEqual(QUnit.extend([], result.result), [2, 4, 6, 8, 10]);
  QUnit.assert.deepEqual(QUnit.extend([], textureResult.toArray(gpu)), [2, 4, 6, 8, 10]);
});