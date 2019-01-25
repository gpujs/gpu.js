(function() {
  const GPU = require('../../src/index');
  function sumABTest(mode) {
    var gpu = new GPU({ mode });
    var f = gpu.createKernel(function(a, b) {
      return (a[this.thread.x] + b[this.thread.x]);
    }, {
      output : [6],
      mode : mode
    });

    QUnit.assert.ok( f !== null, 'function generated test');

    var a = [1, 2, 3, 5, 6, 7];
    var b = [4, 5, 6, 1, 2, 3];

    var res = f(a,b);
    var exp = [5, 7, 9, 6, 8, 10];

    for(var i = 0; i < exp.length; ++i) {
      QUnit.assert.equal(res[i], exp[i], 'Result arr idx: '+i);
    }
    gpu.destroy();
  }

  QUnit.test('sumAB (auto)', function() {
    sumABTest(null);
  });

  QUnit.test('sumAB (gpu)', function() {
    sumABTest('gpu');
  });

  (GPU.isWebGLSupported ? QUnit.test : QUnit.skip)('sumAB (webgl)', function () {
    sumABTest('webgl');
  });

  (GPU.isWebGL2Supported ? QUnit.test : QUnit.skip)('sumAB (webgl2)', function () {
    sumABTest('webgl2');
  });

  (GPU.isHeadlessGLSupported ? QUnit.test : QUnit.skip)('sumAB (headlessgl)', function () {
    sumABTest('headlessgl');
  });

  QUnit.test('sumAB (cpu)', function() {
    sumABTest('cpu');
  });
})();
