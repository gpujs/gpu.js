(function() {
  function reuse(mode) {
    var gpu = new GPU({ mode: mode });

    var f = gpu.createKernel(function(a, b) {
      function custom_adder(a, b) {
        return a + b;
      }
      function some_fun_1(a, b) {
        return custom_adder(a, b);
      }
      function some_fun_2(a, b) {
        return custom_adder(a, b);
      }
      return some_fun_1(1,2) + some_fun_2(a[this.thread.x], b[this.thread.x]);
    })
      .setOutput([6]);

    var a = [1, 2, 3, 5, 6, 7];
    var b = [4, 5, 6, 1, 2, 3];

    var result = f(a,b);
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