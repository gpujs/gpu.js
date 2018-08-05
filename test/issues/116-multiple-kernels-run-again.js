QUnit.test( "Issue #116 - multiple kernels run again (auto)", function() {
  var gpu = new GPU();
  var A = [1, 2, 3, 4, 5];
  var B = [1, 2, 3, 4, 5];

  var sizes = [2, 5, 1];

  function add(a, b, x){
      return a[x] + b[x];
  }

  var layerForward = [];

  for (var i = 0;  i < 2; i++) {
    var kernels = gpu.createKernelMap([add],function(a, b){
            return add(a,b, gpu_threadX);
        }).setOutput([sizes[i + 1]]); // First: 5. Second: 1.

        layerForward.push(kernels);
  }

  var E = layerForward[0](A, B).result;
  var F = layerForward[1](A, B).result;
  var G = layerForward[0](A, B).result;

  QUnit.assert.deepEqual(QUnit.extend([], E), [2, 4, 6, 8, 10]);
  QUnit.assert.deepEqual(QUnit.extend([], F), [2]);
  QUnit.assert.deepEqual(QUnit.extend([], G), [2, 4, 6, 8, 10]);
  gpu.destroy();
});

QUnit.test( "Issue #116 - multiple kernels run again (gpu)", function() {
  var gpu = new GPU({mode: 'gpu'});
  var A = [1, 2, 3, 4, 5];
  var B = [1, 2, 3, 4, 5];

  var sizes = [2, 5, 1];

  function add(a, b, x){
    return a[x] + b[x];
  }

  var layerForward = [];

  for (var i = 0;  i < 2; i++) {
    var kernels = gpu.createKernelMap([add],function(a, b){
      return add(a,b, gpu_threadX);
    }).setOutput([sizes[i + 1]]); // First: 5. Second: 1.

    layerForward.push(kernels);
  }

  var E = layerForward[0](A, B).result;
  var F = layerForward[1](A, B).result;
  var G = layerForward[0](A, B).result;

  QUnit.assert.deepEqual(QUnit.extend([], E), [2, 4, 6, 8, 10]);
  QUnit.assert.deepEqual(QUnit.extend([], F), [2]);
  QUnit.assert.deepEqual(QUnit.extend([], G), [2, 4, 6, 8, 10]);
  gpu.destroy();
});

QUnit.test( "Issue #116 - multiple kernels run again (webgl)", function() {
  var gpu = new GPU({mode: 'webgl'});
  var A = [1, 2, 3, 4, 5];
  var B = [1, 2, 3, 4, 5];

  var sizes = [2, 5, 1];

  function add(a, b, x){
    return a[x] + b[x];
  }

  var layerForward = [];

  for (var i = 0;  i < 2; i++) {
    var kernels = gpu.createKernelMap([add],function(a, b){
      return add(a,b, gpu_threadX);
    }).setOutput([sizes[i + 1]]); // First: 5. Second: 1.

    layerForward.push(kernels);
  }

  var E = layerForward[0](A, B).result;
  var F = layerForward[1](A, B).result;
  var G = layerForward[0](A, B).result;

  QUnit.assert.deepEqual(QUnit.extend([], E), [2, 4, 6, 8, 10]);
  QUnit.assert.deepEqual(QUnit.extend([], F), [2]);
  QUnit.assert.deepEqual(QUnit.extend([], G), [2, 4, 6, 8, 10]);
  gpu.destroy();
});

QUnit.test( "Issue #116 - multiple kernels run again (webgl2)", function() {
  var gpu = new GPU({mode: 'webgl2'});
  var A = [1, 2, 3, 4, 5];
  var B = [1, 2, 3, 4, 5];

  var sizes = [2, 5, 1];

  function add(a, b, x){
    return a[x] + b[x];
  }

  var layerForward = [];

  for (var i = 0;  i < 2; i++) {
    var kernels = gpu.createKernelMap([add],function(a, b){
      return add(a,b, gpu_threadX);
    }).setOutput([sizes[i + 1]]); // First: 5. Second: 1.

    layerForward.push(kernels);
  }

  var E = layerForward[0](A, B).result;
  var F = layerForward[1](A, B).result;
  var G = layerForward[0](A, B).result;

  QUnit.assert.deepEqual(QUnit.extend([], E), [2, 4, 6, 8, 10]);
  QUnit.assert.deepEqual(QUnit.extend([], F), [2]);
  QUnit.assert.deepEqual(QUnit.extend([], G), [2, 4, 6, 8, 10]);
  gpu.destroy();
});