QUnit.test( "Issue #114 - run createKernelMap the second time", function() {

  const gpu = new GPU();
  const A = [1, 2, 3, 4, 5];
  const B = [1, 2, 3, 4, 5];
  function add(a,b){
      return a + b;
  }
  const kernels = gpu.createKernelMap([add],function(a, b){
      return a[this.thread.x] + b[this.thread.x];
  }).setOutput([5]);

  const E = kernels(A, B).result;
  const F = kernels(A, B).result;
  const G = kernels(A, B).result;

  QUnit.assert.deepEqual(QUnit.extend([], E), [2, 4, 6, 8, 10]);
  QUnit.assert.deepEqual(QUnit.extend([], F), [2, 4, 6, 8, 10]);
  QUnit.assert.deepEqual(QUnit.extend([], G), [2, 4, 6, 8, 10]);
});