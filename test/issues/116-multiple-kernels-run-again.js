(() => {
  const GPU = require('../../src/index');

  function test(mode) {
    const gpu = new GPU({ mode });
    const A = [1, 2, 3, 4, 5];
    const B = [1, 2, 3, 4, 5];

    const sizes = [2, 5, 1];

    function add(a, b, x){
      return a[x] + b[x];
    }

    const layerForward = [];

    for (let i = 0;  i < 2; i++) {
      const kernels = gpu.createKernelMap([add],function(a, b){
        return add(a,b, gpu_threadX);
      })
        .setOutput([sizes[i + 1]]); // First: 5. Second: 1.

      layerForward.push(kernels);
    }

    const E = layerForward[0](A, B).result;
    const F = layerForward[1](A, B).result;
    const G = layerForward[0](A, B).result;

    QUnit.assert.deepEqual(Array.from(E), [2, 4, 6, 8, 10]);
    QUnit.assert.deepEqual(Array.from(F), [2]);
    QUnit.assert.deepEqual(Array.from(G), [2, 4, 6, 8, 10]);
    gpu.destroy();
  }

  QUnit.test("Issue #116 - multiple kernels run again (auto)", function() {
    test();
  });

  QUnit.test("Issue #116 - multiple kernels run again (gpu)", function() {
    test('gpu');
  });

  (GPU.isWebGLSupported ? QUnit.test : QUnit.skip)("Issue #116 - multiple kernels run again (webgl)", function() {
    test('webgl');
  });

  (GPU.isWebGL2Supported ? QUnit.test : QUnit.skip)("Issue #116 - multiple kernels run again (webgl2)", function() {
    test('webgl2');
  });

  (GPU.isHeadlessGLSupported ? QUnit.test : QUnit.skip)("Issue #116 - multiple kernels run again (headlessgl)", function() {
    test('headlessgl');
  });

  QUnit.test("Issue #116 - multiple kernels run again (cpu)", function() {
    test('cpu');
  });
})();
