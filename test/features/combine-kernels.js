(function() {
  var gpu = null;
  function combineKernels(mode) {
     gpu = new GPU({ mode: mode });

    var kernel1 = gpu.createKernel(function(a, b) {
      return a[this.thread.x] + b[this.thread.x];
    }, { output: [5] });

    var kernel2 = gpu.createKernel(function(c, d) {
      return c[this.thread.x] * d[this.thread.x];
    }, { output: [5] });

    return gpu.combineKernels(kernel1, kernel2, function(array1, array2, array3) {
      return kernel2(kernel1(array1, array2), array3);
    });
  }

  QUnit.test( "combineKernels (auto)", function() {
    var superKernel = combineKernels(null);
    var result = QUnit.extend([], superKernel([1,2,3,4,5], [1,2,3,4,5], [1,2,3,4,5]));
    QUnit.assert.deepValueEqual(result, [2, 8, 18, 32, 50]);
    gpu.destroy();
  });

  QUnit.test( "combineKernels (gpu)", function() {
    var superKernel = combineKernels('webgl');
    var result = QUnit.extend([], superKernel([1,2,3,4,5], [1,2,3,4,5], [1,2,3,4,5]));
    QUnit.assert.deepValueEqual(result, [2, 8, 18, 32, 50]);
    gpu.destroy();
  });

  QUnit.test( "combineKernels (webgl)", function() {
    var superKernel = combineKernels('webgl');
    var result = QUnit.extend([], superKernel([1,2,3,4,5], [1,2,3,4,5], [1,2,3,4,5]));
    QUnit.assert.deepValueEqual(result, [2, 8, 18, 32, 50]);
    gpu.destroy();
  });

  QUnit.test( "combineKernels (webgl2)", function() {
    var superKernel = combineKernels('webgl2');
    var result = QUnit.extend([], superKernel([1,2,3,4,5], [1,2,3,4,5], [1,2,3,4,5]));
    QUnit.assert.deepValueEqual(result, [2, 8, 18, 32, 50]);
    gpu.destroy();
  });

  QUnit.test( "combineKernels (cpu)", function() {
    var superKernel = combineKernels('cpu');
    var result = QUnit.extend([], superKernel([1,2,3,4,5], [1,2,3,4,5], [1,2,3,4,5]));
    QUnit.assert.deepValueEqual(result, [2, 8, 18, 32, 50]);
    gpu.destroy();
  });
})();