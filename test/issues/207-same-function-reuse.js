(function() {
  function reuse(mode) {
    var gpu = new GPU({ mode: mode });

    var kernel = gpu.createKernel(function(kernelArg1, kernelArg2) {
      function someFun1(someFun1Arg1, someFun1Arg2) {
        return customAdder(someFun1Arg1, someFun1Arg2);
      }
      function someFun2(someFun2Arg1, someFun2Arg2) {
        return customAdder(someFun2Arg1, someFun2Arg2);
      }
      function customAdder(customAdderArg1, customAdderArg2) {
        return customAdderArg1 + customAdderArg2;
      }
      return someFun1(1,2) + someFun2(kernelArg1[this.thread.x], kernelArg2[this.thread.x]);
    })
      .setOutput([6]);

    var a = [1, 2, 3, 5, 6, 7];
    var b = [4, 5, 6, 1, 2, 3];

    var result = kernel(a,b);
    QUnit.assert.deepEqual(QUnit.extend([], result), [8,10,12,9,11,13]);
    gpu.destroy();
  }

  QUnit.test('Issue #207 - same function reuse (cpu)', function() {
    reuse('cpu');
  });

  QUnit.test('Issue #207 - same function reuse (auto)', function() {
    reuse(null);
  });

  QUnit.test('Issue #207 - same function reuse (gpu)', function() {
    reuse('gpu');
  });

  QUnit.test('Issue #207 - same function reuse (webgl)', function() {
    reuse('webgl');
  });

  QUnit.test('Issue #207 - same function reuse (webgl2)', function() {
    reuse('webgl2');
  });
})();