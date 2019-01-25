(function() {
  const GPU = require('../../src/index');
  function nestedSumABTest(mode) {
    var gpu = new GPU({ mode: mode });

    var f = gpu.createKernel(function(a, b) {
      function custom_adder(a,b) {
        return a+b;
      }

      return custom_adder(a[this.thread.x], b[this.thread.x]);
    }, {
      output : [6]
    });

    QUnit.assert.ok(f !== null, 'function generated test');

    var a = [1, 2, 3, 5, 6, 7];
    var b = [4, 5, 6, 1, 2, 3];

    var res = f(a,b);
    var exp = [5, 7, 9, 6, 8, 10];

    for(var i = 0; i < exp.length; ++i) {
      QUnit.assert.equal(res[i], exp[i], 'Result arr idx: '+i);
    }
    gpu.destroy();
  }

  QUnit.test('nested_sum (auto)', () => {
  	nestedSumABTest(null);
  });

  QUnit.test('nested_sum (gpu)', () => {
  	nestedSumABTest('gpu');
  });

  (GPU.isWebGLSupported ? QUnit.test : QUnit.skip)('nested_sum (webgl)', () => {
    nestedSumABTest('webgl');
  });

  (GPU.isWebGL2Supported ? QUnit.test : QUnit.skip)('nested_sum (webgl2)', () => {
    nestedSumABTest('webgl2');
  });

  (GPU.isHeadlessGLSupported ? QUnit.test : QUnit.skip)('nested_sum (headlessgl)', () => {
    nestedSumABTest('headlessgl');
  });

  QUnit.test('nested_sum (CPU)', () => {
    nestedSumABTest('cpu');
  });
})();
