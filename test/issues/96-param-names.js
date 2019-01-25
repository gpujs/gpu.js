var GPU = require('../../src/index');

(function() {
  function getResult(mode) {

    var A = [
      [1, 1, 1],
      [1, 1, 1]
    ];

    var B = [
      [1, 1],
      [1, 1],
      [1, 1]
    ];

    var gpu = new GPU({ mode: mode });

    function multiply(m, n, y, x) {
      var sum = 0;
      for (var i = 0; i < 2; i++) {
        sum += m[y][i] * n[i][x];
      }
      return sum;
    }

    var kernels = gpu.createKernelMap({
      multiplyResult: multiply
    }, function (a, b) {
      return multiply(b, a, this.thread.y, this.thread.x);
    })
      .setOutput([B.length, A.length]);

    var result = kernels(A, B).result;
    QUnit.assert.deepEqual(QUnit.extend([], result[0]), [2,2,2]);
    QUnit.assert.deepEqual(QUnit.extend([], result[1]), [2,2,2]);
    QUnit.assert.deepEqual(QUnit.extend([], result[2]), []);
    gpu.destroy();
    return result;
  }
  QUnit.test("Issue #96 - param names (auto)", function() {
    getResult();
  });
  QUnit.test("Issue #96 - param names (gpu)", function() {
    getResult('gpu');
  });
  (GPU.isWebGLSupported ? QUnit.test : QUnit.skip)("Issue #96 - param names (webgl)", function() {
    getResult('webgl');
  });
  (GPU.isWebGL2Supported ? QUnit.test : QUnit.skip)("Issue #96 - param names (webgl2)", function() {
    getResult('webgl2');
  });
  (GPU.isHeadlessGLSupported ? QUnit.test : QUnit.skip)("Issue #96 - param names (headlessgl)", function() {
    getResult('headlessgl');
  });
  QUnit.test("Issue #96 - param names (cpu)", function() {
    getResult('cpu');
  });
})();
