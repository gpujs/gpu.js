function createKernels(mode, dimensions, canvas) {
  var gpu = new GPU({ mode: mode, canvas: canvas });
  return gpu.createKernels({
    addResult: function add(v1, v2) {
      return v1 + v2;
    },
    divideResult: function divide(v1, v2) {
      return v1 / v2;
    }
  }, function(a, b, c) {
    return divide(add(a[this.thread.x], b[this.thread.x]), c[this.thread.x]);
  }).setDimensions(dimensions);
}

function createKernel(mode, dimensions, canvas) {
  var gpu = new GPU({ mode: mode, canvas: canvas });
  return gpu.createKernel(function(a) {
    return a[this.thread.x];
  }).setDimensions(dimensions);
}

QUnit.test( "createKernels (auto)", function() {
  var canvas = document.createElement('canvas');
  var superKernel = createKernels(null, [1], canvas);
  var kernel = createKernel(null, [1], canvas);
  var output = superKernel([2], [2], [0.5]);
  var result = QUnit.extend([], output.result);
  var addResult = QUnit.extend([], kernel(output.addResult));
  var divideResult = QUnit.extend([], kernel(output.divideResult));
  QUnit.assert.deepEqual(result, [8]);
  QUnit.assert.deepEqual(addResult, [4]);
  QUnit.assert.deepEqual(divideResult, [8]);
});

QUnit.test( "createKernels (gpu)", function() {
  var canvas = document.createElement('canvas');
  var superKernel = createKernels('gpu', [1], canvas);
  var kernel = createKernel('gpu', [1], canvas);
  var output = superKernel([2], [2], [0.5]);
  var result = QUnit.extend([], output.result);
  var addResult = QUnit.extend([], kernel(output.addResult));
  var divideResult = QUnit.extend([], kernel(output.divideResult));
  QUnit.assert.deepEqual(result, [8]);
  QUnit.assert.deepEqual(addResult, [4]);
  QUnit.assert.deepEqual(divideResult, [8]);
});

/** TODO: uncomment and support
QUnit.test( "createKernels (cpu)", function() {
  var canvas = document.createElement('canvas');
  var superKernel = createKernels('cpu', [1], canvas);
  var kernel = createKernel('cpu', [1], canvas);
  var output = superKernel([2], [2], [0.5]);
  console.log(output.result);
  console.log(kernel(output.addResult));
  console.log(kernel(output.divideResult));
  var result = QUnit.extend([], output.result);
  QUnit.assert.deepEqual(result, [8]);
});
 */

QUnit.test( "createKernels (auto)", function() {
  var canvas = document.createElement('canvas');
  var superKernel = createKernels(null, [5], canvas);
  var kernel = createKernel(null, [5], canvas);
  var output = superKernel([1,2,3,4,5], [1,2,3,4,5], [1,2,3,4,5]);
  var result = QUnit.extend([], output.result);
  console.log(kernel(output.addResult));
  var addResult = QUnit.extend([], kernel(output.addResult));
  var divideResult = QUnit.extend([], kernel(output.divideResult));
  QUnit.assert.deepEqual(result, [2, 2, 2, 2, 2]);
  QUnit.assert.deepEqual(addResult, [2, 4, 6, 8, 10]);
  QUnit.assert.deepEqual(divideResult, [2, 2, 2, 2, 2]);
});

QUnit.test( "createKernels (gpu)", function() {
  var canvas = document.createElement('canvas');
  var superKernel = createKernels('gpu', [5], canvas);
  var kernel = createKernel('gpu', [5], canvas);
  var output = superKernel([1,2,3,4,5], [1,2,3,4,5], [1,2,3,4,5]);
  var result = QUnit.extend([], output.result);
  var addResult = QUnit.extend([], kernel(output.addResult));
  var divideResult = QUnit.extend([], kernel(output.divideResult));
  QUnit.assert.deepEqual(result, [2, 2, 2, 2, 2]);
  QUnit.assert.deepEqual(addResult, [2, 4, 6, 8, 10]);
  QUnit.assert.deepEqual(result, [2, 2, 2, 2, 2]);
});

/** TODO: uncomment and support
QUnit.test( "createKernels (cpu)", function() {
  var canvas = document.createElement('canvas');
  var superKernel = createKernels('cpu', [5], canvas);
  var kernel = createKernel('cpu', [5], canvas);
  var output = superKernel([1,2,3,4,5], [1,2,3,4,5], [1,2,3,4,5]);
  console.log(output.result);
  console.log(kernel(output.addResult));
  console.log(kernel(output.divideResult));
  var result = QUnit.extend([], output.result);
  QUnit.assert.deepEqual(result, [8]);
});
 */