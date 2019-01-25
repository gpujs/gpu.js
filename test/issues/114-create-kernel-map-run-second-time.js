(() => {
  const GPU = require('../../src/index');
  function test(mode) {
    const gpu = new GPU({ mode });
    const A = [1, 2, 3, 4, 5];
    const B = [1, 2, 3, 4, 5];
    function add(a,b){
      return a + b;
    }
    const kernels = gpu.createKernelMap([add], function(a, b) {
      return a[this.thread.x] + b[this.thread.x];
    })
      .setOutput([5]);

    const E = kernels(A, B).result;
    const F = kernels(A, B).result;
    const G = kernels(A, B).result;

    QUnit.assert.deepEqual(Array.from(E), [2, 4, 6, 8, 10]);
    QUnit.assert.deepEqual(Array.from(F), [2, 4, 6, 8, 10]);
    QUnit.assert.deepEqual(Array.from(G), [2, 4, 6, 8, 10]);
    gpu.destroy();
  }
  QUnit.test("Issue #114 - run createKernelMap the second time (auto)", () => {
    test();
  });
  QUnit.test("Issue #114 - run createKernelMap the second time (gpu)", () => {
    test('gpu');
  });
  (GPU.isWebGLSupported ? QUnit.test : QUnit.skip)("Issue #114 - run createKernelMap the second time (webgl)", () => {
    test('webgl');
  });
  (GPU.isWebGL2Supported ? QUnit.test : QUnit.skip)("Issue #114 - run createKernelMap the second time (webgl2)", () => {
    test('webgl2');
  });
  (GPU.isHeadlessGLSupported ? QUnit.test : QUnit.skip)("Issue #114 - run createKernelMap the second time (headlessgl)", () => {
    test('headlessgl');
  });
})();
