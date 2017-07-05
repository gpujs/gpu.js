QUnit.test( "Issue #114 - run createKernels the second time", function() {

  const gpu = new GPU();
  const A = [1, 2, 3, 4, 5];
  const B = [1, 2, 3, 4, 5];
  function add(a,b){
      return a + b;
  }
  const kernels = gpu.createKernels([add],function(a, b){
      return a[this.thread.x] + b[this.thread.x];
  }).setDimensions([5]);

  const E = kernels(A, B).result;
  console.log(E);

  const F = kernels(A, B).result;
  console.log(F);
  
  const G = kernels(A, B).result;
  console.log(G);

  QUnit.assert.deepEqual(QUnit.extend([], E), [2, 4, 6, 8, 10]);
  QUnit.assert.deepEqual(QUnit.extend([], F), [2, 4, 6, 8, 10]);
  QUnit.assert.deepEqual(QUnit.extend([], G), [2, 4, 6, 8, 10]);
});