var GPU = require('../../src/index');

(function () {
  function getResult(mode) {
    var A = [
      [1, 2],
      [3, 4],
      [5, 6]
    ];

    var B = [
      [6, 5, 4],
      [3, 2, 1]
    ];

    var gpu = new GPU({ mode: mode });

    function multiply(b, a, y, x) {
      var sum = 0;
      for (var i = 0; i < 2; i++) {
        sum += b[y][i] * a[i][x];
      }
      return sum;
    }

    var kernels = gpu.createKernelMap({
      multiplyResult: multiply
    }, function (a, b) {
      return multiply(b, a, this.thread.y, this.thread.x);
    })
      .setOutput([2, 2]);
    var result = kernels(A, B).result;
    QUnit.assert.deepEqual(QUnit.extend([], result[0]), [21,32]);
    QUnit.assert.deepEqual(QUnit.extend([], result[1]), [9,14]);
    gpu.destroy();
    return kernels;
  }
  (GPU.isWebGL2Supported || (GPU.isHeadlessGLSupported && GPU.HeadlessGLRunner.features.kernelMap) ? QUnit.test : QUnit.skip)("Issue #91 - type detection (auto)", function() {
    getResult();
  });
  (GPU.isWebGL2Supported || (GPU.isHeadlessGLSupported && GPU.HeadlessGLRunner.features.kernelMap) ? QUnit.test : QUnit.skip)("Issue #91 - type detection (gpu)", function() {
    getResult('gpu');
  });
  (GPU.isWebGLSupported ? QUnit.test : QUnit.skip)("Issue #91 - type detection (webgl)", function() {
    var kernel = getResult('webgl');
    QUnit.assert.equal(kernel.kernel.constructor, GPU.WebGLKernel, 'kernel type is wrong');
  });
  (GPU.isWebGL2Supported ? QUnit.test : QUnit.skip)("Issue #91 - type detection (webgl2)", function() {
    var kernel = getResult('webgl2');
    QUnit.assert.equal(kernel.kernel.constructor, GPU.WebGL2Kernel, 'kernel type is wrong');
  });
  (GPU.isHeadlessGLSupported ? QUnit.test : QUnit.skip)("Issue #91 - type detection (headlessgl)", function() {
    QUnit.assert.throws(() => {
      getResult('headlessgl');
    });
  });
  QUnit.test("Issue #91 - type detection (cpu)", function() {
    var kernel = getResult('cpu');
    QUnit.assert.equal(kernel.kernel.constructor, GPU.CPUKernel, 'kernel type is wrong');
  });
})();
