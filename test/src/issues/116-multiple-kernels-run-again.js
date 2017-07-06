QUnit.test( "Issue #116 - multiple kernels run again", function() {

  const gpu = new GPU({mode: 'webgl'});
  const A = [1, 2, 3, 4, 5];
  const B = [1, 2, 3, 4, 5];
  
  const sizes = [2, 5, 1];

  function add(a, b, x){
      return a[x] + b[x];
  }

  const layerForward = [];

  for (let i = 0;  i < 2; i++) {
        const kernels = gpu.createKernels([add],function(a, b){
            return add(a,b, gpu_threadX);
        }).setDimensions([sizes[i + 1]]); // First: 5. Second: 1.

        layerForward.push(kernels);
  }

  const E = layerForward[0](A, B).result;
  const F = layerForward[1](A, B).result;
  const G = layerForward[0](A, B).result;

  QUnit.assert.deepEqual(QUnit.extend([], E), [2, 4, 6, 8, 10]);
  QUnit.assert.deepEqual(QUnit.extend([], F), [2]);
  QUnit.assert.deepEqual(QUnit.extend([], G), [2, 4, 6, 8, 10]);

});