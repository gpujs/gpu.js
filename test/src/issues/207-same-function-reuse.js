function reuse(mode) {
  var gpu = new GPU({ mode: mode });

  var f = gpu.createKernel(function(a, b) {
    function custom_adder(a,b) {
      return a+b;
    }
    function some_fun_1(a,b) {
      return custom_adder(a,b);
    }
    function some_fun_2(a,b) {
      return custom_adder(a,b);
    }
    return some_fun_1(1,2)+some_fun_2(a[this.thread.x], b[this.thread.x]);
  }, {
    dimensions : [6]
  }).setDebug(true).setOutput([6]);

  var a = [1, 2, 3, 5, 6, 7];
  var b = [4, 5, 6, 1, 2, 3];

  var result = f(a,b);
  assert.deepEqual(QUnit.extend([], result), [5,7,9,6,8,10]);
}

QUnit.test('Issue #207 - same function reuse CPU', function() {
  reuse('cpu');
});

QUnit.test('Issue #207 - same function reuse GPU', function() {
  reuse('gpu');
});