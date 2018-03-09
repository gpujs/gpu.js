QUnit.test('Issue #233 - kernel map with float output (GPU only) (auto)', function() {
    var lst = [1, 2, 3, 4, 5, 6, 7];

    var gpu = new GPU({ mode: null });

    var kernels = gpu.createKernelMap({
        stepA: function (x) {
            return x * x;
        },
        stepB: function (x) {
            return x + 1;
        }
    }, function (lst) {
        var val = lst[this.thread.x];

        stepA(val);
        stepB(val);

        return val;
    })
        .setFloatOutput(true)
        .setOutput([lst.length]);

    var result = kernels(lst);

    var unwrap = gpu.createKernel(function(x) {
        return x[this.thread.x];
    })
        .setFloatTextures(true)
        .setOutput([lst.length]);

    var stepAResult = unwrap(result.stepA);
    var stepBResult = unwrap(result.stepB);

    QUnit.assert.deepEqual(QUnit.extend([], stepAResult), lst.map(function (x) { return x * x }));
    QUnit.assert.deepEqual(QUnit.extend([], stepBResult), lst.map(function (x) { return x + 1 }));
    QUnit.assert.deepEqual(QUnit.extend([], result.result), lst);
});

QUnit.test('Issue #233 - kernel map with float output (GPU only) (gpu)', function() {
  var lst = [1, 2, 3, 4, 5, 6, 7];

  var gpu = new GPU({ mode: 'gpu' });

  var kernels = gpu.createKernelMap({
    stepA: function (x) {
      return x * x;
    },
    stepB: function (x) {
      return x + 1;
    }
  }, function (lst) {
    var val = lst[this.thread.x];

    stepA(val);
    stepB(val);

    return val;
  })
    .setFloatOutput(true)
    .setOutput([lst.length]);

  var result = kernels(lst);

  var unwrap = gpu.createKernel(function(x) {
    return x[this.thread.x];
  })
    .setFloatTextures(true)
    .setOutput([lst.length]);

  var stepAResult = unwrap(result.stepA);
  var stepBResult = unwrap(result.stepB);

  QUnit.assert.deepEqual(QUnit.extend([], stepAResult), lst.map(function (x) { return x * x }));
  QUnit.assert.deepEqual(QUnit.extend([], stepBResult), lst.map(function (x) { return x + 1 }));
  QUnit.assert.deepEqual(QUnit.extend([], result.result), lst);
});

QUnit.test('Issue #233 - kernel map with float output (GPU only) (webgl)', function() {
  var lst = [1, 2, 3, 4, 5, 6, 7];

  var gpu = new GPU({ mode: 'webgl' });

  var kernels = gpu.createKernelMap({
    stepA: function (x) {
      return x * x;
    },
    stepB: function (x) {
      return x + 1;
    }
  }, function (lst) {
    var val = lst[this.thread.x];

    stepA(val);
    stepB(val);

    return val;
  })
    .setFloatOutput(true)
    .setOutput([lst.length]);

  var result = kernels(lst);

  var unwrap = gpu.createKernel(function(x) {
    return x[this.thread.x];
  })
    .setFloatTextures(true)
    .setOutput([lst.length]);

  var stepAResult = unwrap(result.stepA);
  var stepBResult = unwrap(result.stepB);

  QUnit.assert.deepEqual(QUnit.extend([], stepAResult), lst.map(function (x) { return x * x }));
  QUnit.assert.deepEqual(QUnit.extend([], stepBResult), lst.map(function (x) { return x + 1 }));
  QUnit.assert.deepEqual(QUnit.extend([], result.result), lst);
});

QUnit.test('Issue #233 - kernel map with float output (GPU only) (webgl2)', function() {
  var lst = [1, 2, 3, 4, 5, 6, 7];

  var gpu = new GPU({ mode: 'webgl2' });

  var kernels = gpu.createKernelMap({
    stepA: function (x) {
      return x * x;
    },
    stepB: function (x) {
      return x + 1;
    }
  }, function (lst) {
    var val = lst[this.thread.x];

    stepA(val);
    stepB(val);

    return val;
  })
    .setFloatOutput(true)
    .setOutput([lst.length]);

  var result = kernels(lst);

  var unwrap = gpu.createKernel(function(x) {
    return x[this.thread.x];
  })
    .setFloatTextures(true)
    .setOutput([lst.length]);

  var stepAResult = unwrap(result.stepA);
  var stepBResult = unwrap(result.stepB);

  QUnit.assert.deepEqual(QUnit.extend([], stepAResult), lst.map(function (x) { return x * x }));
  QUnit.assert.deepEqual(QUnit.extend([], stepBResult), lst.map(function (x) { return x + 1 }));
  QUnit.assert.deepEqual(QUnit.extend([], result.result), lst);
});