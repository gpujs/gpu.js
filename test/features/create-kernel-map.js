(function() {
  function createPropertyKernels(gpu, output) {
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

  function createArrayKernels(gpu, output) {
    return gpu.createKernelMap([
      function add(v1, v2) {
        return v1 + v2;
      },
      function divide(v1, v2) {
        return v1 / v2;
      }
    ], function (a, b, c) {
      return divide(add(a[this.thread.x], b[this.thread.x]), c[this.thread.x]);
    }).setOutput(output)
  }


  function createKernel(gpu, output) {
    return gpu.createKernel(function (a) {
      return a[this.thread.x];
    }).setOutput(output);
  }

  QUnit.test('createKernelMap object 1 dimension 1 length (auto)', function() {
    var canvas = document.createElement('canvas');
    var gpu = new GPU({mode: null, canvas: canvas});
    var superKernel = createPropertyKernels(gpu, [1]);
    var kernel = createKernel(gpu, [1]);
    var output = superKernel([2], [2], [0.5]);
    var result = QUnit.extend([], output.result);
    var addResult = QUnit.extend([], kernel(output.addResult));
    var divideResult = QUnit.extend([], kernel(output.divideResult));
    QUnit.assert.deepEqual(result, [8]);
    QUnit.assert.deepEqual(addResult, [4]);
    QUnit.assert.deepEqual(divideResult, [8]);
    gpu.destroy();
  });

  QUnit.test('createKernelMap object 1 dimension 1 length (gpu)', function() {
    var canvas = document.createElement('canvas');
    var gpu = new GPU({mode: 'gpu', canvas: canvas});
    var superKernel = createPropertyKernels(gpu, [1]);
    var kernel = createKernel(gpu, [1]);
    var output = superKernel([2], [2], [0.5]);
    var result = QUnit.extend([], output.result);
    var addResult = QUnit.extend([], kernel(output.addResult));
    var divideResult = QUnit.extend([], kernel(output.divideResult));
    QUnit.assert.deepEqual(result, [8]);
    QUnit.assert.deepEqual(addResult, [4]);
    QUnit.assert.deepEqual(divideResult, [8]);
    gpu.destroy();
  });

  QUnit.test('createKernelMap object 1 dimension 1 length (webgl)', function() {
    var canvas = document.createElement('canvas');
    var gpu = new GPU({mode: 'webgl', canvas: canvas});
    var superKernel = createPropertyKernels(gpu, [1]);
    var kernel = createKernel(gpu, [1]);
    var output = superKernel([2], [2], [0.5]);
    var result = QUnit.extend([], output.result);
    var addResult = QUnit.extend([], kernel(output.addResult));
    var divideResult = QUnit.extend([], kernel(output.divideResult));
    QUnit.assert.deepEqual(result, [8]);
    QUnit.assert.deepEqual(addResult, [4]);
    QUnit.assert.deepEqual(divideResult, [8]);
    gpu.destroy();
  });

  QUnit.test('createKernelMap object 1 dimension 1 length (webgl2)', function() {
    var canvas = document.createElement('canvas');
    var gpu = new GPU({mode: 'webgl2', canvas: canvas});
    var superKernel = createPropertyKernels(gpu, [1]);
    var kernel = createKernel(gpu, [1]);
    var output = superKernel([2], [2], [0.5]);
    var result = QUnit.extend([], output.result);
    var addResult = QUnit.extend([], kernel(output.addResult));
    var divideResult = QUnit.extend([], kernel(output.divideResult));
    QUnit.assert.deepEqual(result, [8]);
    QUnit.assert.deepEqual(addResult, [4]);
    QUnit.assert.deepEqual(divideResult, [8]);
    gpu.destroy();
  });

  QUnit.test('createKernelMap object 1 dimension 1 length (cpu)', function() {
    var canvas = document.createElement('canvas');
    var gpu = new GPU({mode: 'cpu', canvas: canvas});
    var superKernel = createPropertyKernels(gpu, [1]);
    var kernel = createKernel(gpu, [1]);
    var output = superKernel([2], [2], [0.5]);
    var result = QUnit.extend([], output.result);
    var addResult = QUnit.extend([], kernel(output.addResult));
    var divideResult = QUnit.extend([], kernel(output.divideResult));
    QUnit.assert.deepEqual(result, [8]);
    QUnit.assert.deepEqual(addResult, [4]);
    QUnit.assert.deepEqual(divideResult, [8]);
    gpu.destroy();
  });

  QUnit.test('createKernelMap array 1 dimension 1 length (auto)', function() {
    var canvas = document.createElement('canvas');
    var gpu = new GPU({mode: null, canvas: canvas});
    var superKernel = createArrayKernels(gpu, [1]);
    var kernel = createKernel(gpu, [1]);
    var output = superKernel([2], [2], [0.5]);
    var result = QUnit.extend([], output.result);
    var addResult = QUnit.extend([], kernel(output[0]));
    var divideResult = QUnit.extend([], kernel(output[1]));
    QUnit.assert.deepEqual(result, [8]);
    QUnit.assert.deepEqual(addResult, [4]);
    QUnit.assert.deepEqual(divideResult, [8]);
    gpu.destroy();
  });

  QUnit.test('createKernelMap array 1 dimension 1 length (gpu)', function() {
    var canvas = document.createElement('canvas');
    var gpu = new GPU({mode: 'gpu', canvas: canvas});
    var superKernel = createArrayKernels(gpu, [1]);
    var kernel = createKernel(gpu, [1]);
    var output = superKernel([2], [2], [0.5]);
    var result = QUnit.extend([], output.result);
    var addResult = QUnit.extend([], kernel(output[0]));
    var divideResult = QUnit.extend([], kernel(output[1]));
    QUnit.assert.deepEqual(result, [8]);
    QUnit.assert.deepEqual(addResult, [4]);
    QUnit.assert.deepEqual(divideResult, [8]);
    gpu.destroy();
  });

  QUnit.test('createKernelMap array 1 dimension 1 length (webgl)', function() {
    var canvas = document.createElement('canvas');
    var gpu = new GPU({mode: 'webgl', canvas: canvas});
    var superKernel = createArrayKernels(gpu, [1]);
    var kernel = createKernel(gpu, [1]);
    var output = superKernel([2], [2], [0.5]);
    var result = QUnit.extend([], output.result);
    var addResult = QUnit.extend([], kernel(output[0]));
    var divideResult = QUnit.extend([], kernel(output[1]));
    QUnit.assert.deepEqual(result, [8]);
    QUnit.assert.deepEqual(addResult, [4]);
    QUnit.assert.deepEqual(divideResult, [8]);
    gpu.destroy();
  });

  QUnit.test('createKernelMap array 1 dimension 1 length (webgl2)', function() {
    var canvas = document.createElement('canvas');
    var gpu = new GPU({mode: 'webgl2', canvas: canvas});
    var superKernel = createArrayKernels(gpu, [1]);
    var kernel = createKernel(gpu, [1]);
    var output = superKernel([2], [2], [0.5]);
    var result = QUnit.extend([], output.result);
    var addResult = QUnit.extend([], kernel(output[0]));
    var divideResult = QUnit.extend([], kernel(output[1]));
    QUnit.assert.deepEqual(result, [8]);
    QUnit.assert.deepEqual(addResult, [4]);
    QUnit.assert.deepEqual(divideResult, [8]);
    gpu.destroy();
  });

  QUnit.test('createKernelMap array 1 dimension 1 length (cpu)', function() {
    var canvas = document.createElement('canvas');
    var gpu = new GPU({mode: 'cpu', canvas: canvas});
    var superKernel = createArrayKernels(gpu, [1]);
    var output = superKernel([2], [2], [0.5]);
    var result = QUnit.extend([], output.result);
    var addResult = QUnit.extend([], output[0]);
    var divideResult = QUnit.extend([], output[1]);
    QUnit.assert.deepEqual(result, [8]);
    QUnit.assert.deepEqual(addResult, [4]);
    QUnit.assert.deepEqual(divideResult, [8]);
    gpu.destroy();
  });

  QUnit.test('createKernelMap object 1 dimension 5 length (auto)', function() {
    var canvas = document.createElement('canvas');
    var gpu = new GPU({mode: null, canvas: canvas});
    var superKernel = createPropertyKernels(gpu, [5]);
    var kernel = createKernel(gpu, [5]);
    var output = superKernel([1,2,3,4,5], [1,2,3,4,5], [1,2,3,4,5]);
    var result = QUnit.extend([], output.result);
    var addResult = QUnit.extend([], kernel(output.addResult));
    var divideResult = QUnit.extend([], kernel(output.divideResult));
    QUnit.assert.deepEqual(result, [2, 2, 2, 2, 2]);
    QUnit.assert.deepEqual(addResult, [2, 4, 6, 8, 10]);
    QUnit.assert.deepEqual(divideResult, [2, 2, 2, 2, 2]);
    gpu.destroy();
  });

  QUnit.test('createKernelMap object 1 dimension 5 length (gpu)', function() {
    var canvas = document.createElement('canvas');
    var gpu = new GPU({mode: 'gpu', canvas: canvas});
    var superKernel = createPropertyKernels(gpu, [5]);
    var kernel = createKernel(gpu, [5]);
    var output = superKernel([1,2,3,4,5], [1,2,3,4,5], [1,2,3,4,5]);
    var result = QUnit.extend([], output.result);
    var addResult = QUnit.extend([], kernel(output.addResult));
    var divideResult = QUnit.extend([], kernel(output.divideResult));
    QUnit.assert.deepEqual(result, [2, 2, 2, 2, 2]);
    QUnit.assert.deepEqual(addResult, [2, 4, 6, 8, 10]);
    QUnit.assert.deepEqual(divideResult, [2, 2, 2, 2, 2]);
    gpu.destroy();
  });

  QUnit.test('createKernelMap object 1 dimension 5 length (webgl)', function() {
    var canvas = document.createElement('canvas');
    var gpu = new GPU({mode: 'webgl', canvas: canvas});
    var superKernel = createPropertyKernels(gpu, [5]);
    var kernel = createKernel(gpu, [5]);
    var output = superKernel([1,2,3,4,5], [1,2,3,4,5], [1,2,3,4,5]);
    var result = QUnit.extend([], output.result);
    var addResult = QUnit.extend([], kernel(output.addResult));
    var divideResult = QUnit.extend([], kernel(output.divideResult));
    QUnit.assert.deepEqual(result, [2, 2, 2, 2, 2]);
    QUnit.assert.deepEqual(addResult, [2, 4, 6, 8, 10]);
    QUnit.assert.deepEqual(divideResult, [2, 2, 2, 2, 2]);
    gpu.destroy();
  });

  QUnit.test('createKernelMap object 1 dimension 5 length (webgl2)', function() {
    var canvas = document.createElement('canvas');
    var gpu = new GPU({mode: 'webgl2', canvas: canvas});
    var superKernel = createPropertyKernels(gpu, [5]);
    var kernel = createKernel(gpu, [5]);
    var output = superKernel([1,2,3,4,5], [1,2,3,4,5], [1,2,3,4,5]);
    var result = QUnit.extend([], output.result);
    var addResult = QUnit.extend([], kernel(output.addResult));
    var divideResult = QUnit.extend([], kernel(output.divideResult));
    QUnit.assert.deepEqual(result, [2, 2, 2, 2, 2]);
    QUnit.assert.deepEqual(addResult, [2, 4, 6, 8, 10]);
    QUnit.assert.deepEqual(divideResult, [2, 2, 2, 2, 2]);
    gpu.destroy();
  });

  QUnit.test('createKernelMap object 1 dimension 5 length (cpu)', function() {
    var canvas = document.createElement('canvas');
    var gpu = new GPU({mode: 'cpu', canvas: canvas});
    var superKernel = createPropertyKernels(gpu, [5]);
    var kernel = createKernel(gpu, [5]);
    var output = superKernel([1,2,3,4,5], [1,2,3,4,5], [1,2,3,4,5]);
    var result = QUnit.extend([], output.result);
    var addResult = QUnit.extend([], kernel(output.addResult));
    var divideResult = QUnit.extend([], kernel(output.divideResult));
    QUnit.assert.deepEqual(result, [2, 2, 2, 2, 2]);
    QUnit.assert.deepEqual(addResult, [2, 4, 6, 8, 10]);
    QUnit.assert.deepEqual(divideResult, [2, 2, 2, 2, 2]);
    gpu.destroy();
  });

  QUnit.test('createKernelMap array (auto)', function() {
    var canvas = document.createElement('canvas');
    var gpu = new GPU({mode: null, canvas: canvas});
    var superKernel = createArrayKernels(gpu, [5]);
    var kernel = createKernel(gpu, [5]);
    var output = superKernel([1,2,3,4,5], [1,2,3,4,5], [1,2,3,4,5]);
    var result = QUnit.extend([], output.result);
    var addResult = QUnit.extend([], kernel(output[0]));
    var divideResult = QUnit.extend([], kernel(output[1]));
    QUnit.assert.deepEqual(result, [2, 2, 2, 2, 2]);
    QUnit.assert.deepEqual(addResult, [2, 4, 6, 8, 10]);
    QUnit.assert.deepEqual(divideResult, [2, 2, 2, 2, 2]);
    gpu.destroy();
  });

  QUnit.test('createKernelMap array (gpu)', function() {
    var canvas = document.createElement('canvas');
    var gpu = new GPU({mode: 'gpu', canvas: canvas});
    var superKernel = createArrayKernels(gpu, [5]);
    var kernel = createKernel(gpu, [5]);
    var output = superKernel([1,2,3,4,5], [1,2,3,4,5], [1,2,3,4,5]);
    var result = QUnit.extend([], output.result);
    var addResult = QUnit.extend([], kernel(output[0]));
    var divideResult = QUnit.extend([], kernel(output[1]));
    QUnit.assert.deepEqual(result, [2, 2, 2, 2, 2]);
    QUnit.assert.deepEqual(addResult, [2, 4, 6, 8, 10]);
    QUnit.assert.deepEqual(divideResult, [2, 2, 2, 2, 2]);
    gpu.destroy();
  });

  QUnit.test('createKernelMap array (webgl)', function() {
    var canvas = document.createElement('canvas');
    var gpu = new GPU({mode: 'webgl', canvas: canvas});
    var superKernel = createArrayKernels(gpu, [5]);
    var kernel = createKernel(gpu, [5]);
    var output = superKernel([1,2,3,4,5], [1,2,3,4,5], [1,2,3,4,5]);
    var result = QUnit.extend([], output.result);
    var addResult = QUnit.extend([], kernel(output[0]));
    var divideResult = QUnit.extend([], kernel(output[1]));
    QUnit.assert.deepEqual(result, [2, 2, 2, 2, 2]);
    QUnit.assert.deepEqual(addResult, [2, 4, 6, 8, 10]);
    QUnit.assert.deepEqual(divideResult, [2, 2, 2, 2, 2]);
    gpu.destroy();
  });

  QUnit.test('createKernelMap array (webgl2)', function() {
    var canvas = document.createElement('canvas');
    var gpu = new GPU({mode: 'webgl2', canvas: canvas});
    var superKernel = createArrayKernels(gpu, [5]);
    var kernel = createKernel(gpu, [5]);
    var output = superKernel([1,2,3,4,5], [1,2,3,4,5], [1,2,3,4,5]);
    var result = QUnit.extend([], output.result);
    var addResult = QUnit.extend([], kernel(output[0]));
    var divideResult = QUnit.extend([], kernel(output[1]));
    QUnit.assert.deepEqual(result, [2, 2, 2, 2, 2]);
    QUnit.assert.deepEqual(addResult, [2, 4, 6, 8, 10]);
    QUnit.assert.deepEqual(divideResult, [2, 2, 2, 2, 2]);
    gpu.destroy();
  });

  QUnit.test('createKernelMap array (cpu)', function() {
    var canvas = document.createElement('canvas');
    var gpu = new GPU({mode: 'cpu', canvas: canvas});
    var superKernel = createArrayKernels(gpu, [5]);
    var output = superKernel([1,2,3,4,5], [1,2,3,4,5], [1,2,3,4,5]);
    var result = QUnit.extend([], output.result);
    var addResult = QUnit.extend([], output[0]);
    var divideResult = QUnit.extend([], output[1]);
    QUnit.assert.deepEqual(result, [2, 2, 2, 2, 2]);
    QUnit.assert.deepEqual(addResult, [2, 4, 6, 8, 10]);
    QUnit.assert.deepEqual(divideResult, [2, 2, 2, 2, 2]);
    gpu.destroy();
  });

  QUnit.test('createKernelMap 3d (auto)', function() {
    var gpu = new GPU();
    var kernel = gpu.createKernelMap({
      target: function saveTarget(value) {
        return value;
      }
    }, function(value) {
      return saveTarget(value);
    }).setOutput([3,3,3]);
    var result = kernel(1);
    var target = createKernel(gpu, [3,3,3])(result.target);
    QUnit.assert.equal(result.result.length, 3);
    QUnit.assert.equal(result.result[0].length, 3);
    QUnit.assert.equal(result.result[0][0].length, 3);

    QUnit.assert.equal(target.length, 3);
    QUnit.assert.equal(target[0].length, 3);
    QUnit.assert.equal(target[0][0].length, 3);
    gpu.destroy();
  });

  QUnit.test('createKernelMap 3d (gpu)', function() {
    var gpu = new GPU({ mode: 'gpu' });
    var kernel = gpu.createKernelMap({
      target: function saveTarget(value) {
        return value;
      }
    }, function(value) {
      return saveTarget(value);
    }).setOutput([3,3,3]);
    var result = kernel(1);
    var target = createKernel(gpu, [3,3,3])(result.target);
    QUnit.assert.equal(result.result.length, 3);
    QUnit.assert.equal(result.result[0].length, 3);
    QUnit.assert.equal(result.result[0][0].length, 3);

    QUnit.assert.equal(target.length, 3);
    QUnit.assert.equal(target[0].length, 3);
    QUnit.assert.equal(target[0][0].length, 3);
    gpu.destroy();
  });

  QUnit.test('createKernelMap 3d (webgl)', function() {
    var gpu = new GPU({ mode: 'webgl' });
    var kernel = gpu.createKernelMap({
      target: function saveTarget(value) {
        return value;
      }
    }, function(value) {
      return saveTarget(value);
    }).setOutput([3,3,3]);
    var result = kernel(1);
    var target = createKernel(gpu, [3,3,3])(result.target);
    QUnit.assert.equal(result.result.length, 3);
    QUnit.assert.equal(result.result[0].length, 3);
    QUnit.assert.equal(result.result[0][0].length, 3);

    QUnit.assert.equal(target.length, 3);
    QUnit.assert.equal(target[0].length, 3);
    QUnit.assert.equal(target[0][0].length, 3);
    gpu.destroy();
  });

  QUnit.test('createKernelMap 3d (webgl2)', function() {
    var gpu = new GPU({ mode: 'webgl2' });
    var kernel = gpu.createKernelMap({
      target: function saveTarget(value) {
        return value;
      }
    }, function(value) {
      return saveTarget(value);
    }).setOutput([3,3,3]);
    var result = kernel(1);
    var target = createKernel(gpu, [3,3,3])(result.target);
    QUnit.assert.equal(result.result.length, 3);
    QUnit.assert.equal(result.result[0].length, 3);
    QUnit.assert.equal(result.result[0][0].length, 3);

    QUnit.assert.equal(target.length, 3);
    QUnit.assert.equal(target[0].length, 3);
    QUnit.assert.equal(target[0][0].length, 3);
    gpu.destroy();
  });

  QUnit.test('createKernelMap 3d (cpu)', function() {
    var gpu = new GPU({ mode: 'cpu' });
    var kernel = gpu.createKernelMap({
      target: function saveTarget(value) {
        return value;
      }
    }, function(value) {
      return saveTarget(value);
    }).setOutput([3,3,3]);
    var result = kernel(1);
    QUnit.assert.equal(result.result.length, 3);
    QUnit.assert.equal(result.result[0].length, 3);
    QUnit.assert.equal(result.result[0][0].length, 3);

    QUnit.assert.equal(result.target.length, 3);
    QUnit.assert.equal(result.target[0].length, 3);
    QUnit.assert.equal(result.target[0][0].length, 3);
    gpu.destroy();
  });
})();