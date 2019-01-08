(function() {
  function typedArrayTest(mode) {
    var gpu = new GPU({ mode: mode });

    const kernel = gpu.createKernel(function() {
      for (var sum=0, i=0; i<2; i++) {
        sum += i;
      }
      return sum;
    }).setOutput([1, 1]);

    var result = kernel();
    QUnit.assert.equal(result.length, 1);
    QUnit.assert.equal(result[0], 1);
    gpu.destroy();
  }

  QUnit.test('Issue #152 - for vars (cpu)', function() {
    typedArrayTest('cpu');
  });

  QUnit.test('Issue #152 - for vars (auto)', function() {
    typedArrayTest('gpu');
  });

  QUnit.test('Issue #152 - for vars (gpu)', function() {
    typedArrayTest('gpu');
  });

  QUnit.test('Issue #152 - for vars (webgl)', function() {
    typedArrayTest('webgl');
  });

  QUnit.test('Issue #152 - for vars (webgl2)', function() {
    typedArrayTest('webgl2');
  });
})();