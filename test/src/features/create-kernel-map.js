function createPropertyKernels(mode, output, canvas) {
  var gpu = new GPU({mode: mode, canvas: canvas});
  return gpu.createKernelMap({
    addResult: GPU.alias('adder', function add(v1, v2) {
      return v1 + v2;
    }),
    divideResult: function divide(v1, v2) {
      return v1 / v2;
    }
  }, function (a, b, c) {
    return divide(adder(a[this.thread.x], b[this.thread.x]), c[this.thread.x]);
  }).setOutput(output);
}

function createArrayKernels(mode, output, canvas) {
  var gpu = new GPU({mode: mode, canvas: canvas});
  return gpu.createKernelMap([
    function add(v1, v2) {
      return v1 + v2;
    },
    function divide(v1, v2) {
      return v1 / v2;
    }
  ], function (a, b, c) {
    return divide(add(a[this.thread.x], b[this.thread.x]), c[this.thread.x]);
  }).setOutput(output);
}


function createKernel(mode, output, canvas) {
  var gpu = new GPU({mode: mode, canvas: canvas});
  return gpu.createKernel(function (a) {
    return a[this.thread.x];
  }).setOutput(output);
}

QUnit.test( "createKernelMap object 1 dimension 1 length (auto)", function() {
  var canvas = document.createElement('canvas');
  var superKernel = createPropertyKernels(null, [1], canvas);
  var kernel = createKernel(null, [1], canvas);
  var output = superKernel([2], [2], [0.5]);
  var result = QUnit.extend([], output.result);
  var addResult = QUnit.extend([], kernel(output.addResult));
  var divideResult = QUnit.extend([], kernel(output.divideResult));
  QUnit.assert.deepEqual(result, [8]);
  QUnit.assert.deepEqual(addResult, [4]);
  QUnit.assert.deepEqual(divideResult, [8]);
});

QUnit.test( "createKernelMap object 1 dimension 1 length (gpu)", function() {
  var canvas = document.createElement('canvas');
  var superKernel = createPropertyKernels('gpu', [1], canvas);
  var kernel = createKernel('gpu', [1], canvas);
  var output = superKernel([2], [2], [0.5]);
  var result = QUnit.extend([], output.result);
  var addResult = QUnit.extend([], kernel(output.addResult));
  var divideResult = QUnit.extend([], kernel(output.divideResult));
  QUnit.assert.deepEqual(result, [8]);
  QUnit.assert.deepEqual(addResult, [4]);
  QUnit.assert.deepEqual(divideResult, [8]);
});

QUnit.test( "createKernelMap (cpu)", function() {
  var canvas = document.createElement('canvas');
  var superKernel = createPropertyKernels('cpu', [1], canvas);
  var output = superKernel([2], [2], [0.5]);
  var result = QUnit.extend([], output.result);
  var addResult = QUnit.extend([], output.addResult);
  var divideResult = QUnit.extend([], output.divideResult);
  QUnit.assert.deepEqual(result, [8]);
  QUnit.assert.deepEqual(addResult, [4]);
  QUnit.assert.deepEqual(divideResult, [8]);
});

QUnit.test( "createKernelMap array 1 dimension 1 length (auto)", function() {
  var canvas = document.createElement('canvas');
  var superKernel = createArrayKernels('gpu', [1], canvas);
  var kernel = createKernel('gpu', [1], canvas);
  var output = superKernel([2], [2], [0.5]);
  var result = QUnit.extend([], output.result);
  var addResult = QUnit.extend([], kernel(output[0]));
  var divideResult = QUnit.extend([], kernel(output[1]));
  QUnit.assert.deepEqual(result, [8]);
  QUnit.assert.deepEqual(addResult, [4]);
  QUnit.assert.deepEqual(divideResult, [8]);
});

QUnit.test( "createKernelMap array 1 dimension 1 length (gpu)", function() {
  var canvas = document.createElement('canvas');
  var superKernel = createArrayKernels('gpu', [1], canvas);
  var kernel = createKernel('gpu', [1], canvas);
  var output = superKernel([2], [2], [0.5]);
  var result = QUnit.extend([], output.result);
  var addResult = QUnit.extend([], kernel(output[0]));
  var divideResult = QUnit.extend([], kernel(output[1]));
  QUnit.assert.deepEqual(result, [8]);
  QUnit.assert.deepEqual(addResult, [4]);
  QUnit.assert.deepEqual(divideResult, [8]);
});

QUnit.test( "createKernelMap array 1 dimension 1 length (cpu)", function() {
  var canvas = document.createElement('canvas');
  var superKernel = createArrayKernels('cpu', [1], canvas);
  var output = superKernel([2], [2], [0.5]);
  var result = QUnit.extend([], output.result);
  var addResult = QUnit.extend([], output[0]);
  var divideResult = QUnit.extend([], output[1]);
  QUnit.assert.deepEqual(result, [8]);
  QUnit.assert.deepEqual(addResult, [4]);
  QUnit.assert.deepEqual(divideResult, [8]);
});

QUnit.test( "createKernelMap object 1 dimension 5 length (auto)", function() {
  var canvas = document.createElement('canvas');
  var superKernel = createPropertyKernels(null, [5], canvas, true);
  var kernel = createKernel(null, [5], canvas, true);
  var output = superKernel([1,2,3,4,5], [1,2,3,4,5], [1,2,3,4,5]);
  var result = QUnit.extend([], output.result);
  var addResult = QUnit.extend([], kernel(output.addResult));
  var divideResult = QUnit.extend([], kernel(output.divideResult));
  QUnit.assert.deepEqual(result, [2, 2, 2, 2, 2]);
  QUnit.assert.deepEqual(addResult, [2, 4, 6, 8, 10]);
  QUnit.assert.deepEqual(divideResult, [2, 2, 2, 2, 2]);
});

QUnit.test( "createKernelMap object 1 dimension 5 length (gpu)", function() {
  var canvas = document.createElement('canvas');
  var superKernel = createPropertyKernels('gpu', [5], canvas);
  var kernel = createKernel('gpu', [5], canvas);
  var output = superKernel([1,2,3,4,5], [1,2,3,4,5], [1,2,3,4,5]);
  var result = QUnit.extend([], output.result);
  var addResult = QUnit.extend([], kernel(output.addResult));
  var divideResult = QUnit.extend([], kernel(output.divideResult));
  QUnit.assert.deepEqual(result, [2, 2, 2, 2, 2]);
  QUnit.assert.deepEqual(addResult, [2, 4, 6, 8, 10]);
  QUnit.assert.deepEqual(divideResult, [2, 2, 2, 2, 2]);
});

QUnit.test( "createKernelMap array (auto)", function() {
  var canvas = document.createElement('canvas');
  var superKernel = createArrayKernels(null, [5], canvas, true);
  var kernel = createKernel(null, [5], canvas, true);
  var output = superKernel([1,2,3,4,5], [1,2,3,4,5], [1,2,3,4,5]);
  var result = QUnit.extend([], output.result);
  var addResult = QUnit.extend([], kernel(output[0]));
  var divideResult = QUnit.extend([], kernel(output[1]));
  QUnit.assert.deepEqual(result, [2, 2, 2, 2, 2]);
  QUnit.assert.deepEqual(addResult, [2, 4, 6, 8, 10]);
  QUnit.assert.deepEqual(divideResult, [2, 2, 2, 2, 2]);
});

QUnit.test( "createKernelMap array (gpu)", function() {
  var canvas = document.createElement('canvas');
  var superKernel = createArrayKernels('gpu', [5], canvas);
  var kernel = createKernel('gpu', [5], canvas);
  var output = superKernel([1,2,3,4,5], [1,2,3,4,5], [1,2,3,4,5]);
  var result = QUnit.extend([], output.result);
  var addResult = QUnit.extend([], kernel(output[0]));
  var divideResult = QUnit.extend([], kernel(output[1]));
  QUnit.assert.deepEqual(result, [2, 2, 2, 2, 2]);
  QUnit.assert.deepEqual(addResult, [2, 4, 6, 8, 10]);
  QUnit.assert.deepEqual(divideResult, [2, 2, 2, 2, 2]);
});

QUnit.test( "createKernelMap array (cpu)", function() {
  var canvas = document.createElement('canvas');
  var superKernel = createArrayKernels('cpu', [5], canvas);
  var output = superKernel([1,2,3,4,5], [1,2,3,4,5], [1,2,3,4,5]);
  var result = QUnit.extend([], output.result);
  var addResult = QUnit.extend([], output[0]);
  var divideResult = QUnit.extend([], output[1]);
  QUnit.assert.deepEqual(result, [2, 2, 2, 2, 2]);
  QUnit.assert.deepEqual(addResult, [2, 4, 6, 8, 10]);
  QUnit.assert.deepEqual(divideResult, [2, 2, 2, 2, 2]);
});