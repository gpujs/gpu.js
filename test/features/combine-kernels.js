(() => {
  const GPU = require('../../src/index');
  let gpu = null;
  function combineKernels(mode) {
     gpu = new GPU({ mode: mode });

    const kernel1 = gpu.createKernel(function(a, b) {
      return a[this.thread.x] + b[this.thread.x];
    }, { output: [5] });

    const kernel2 = gpu.createKernel(function(c, d) {
      return c[this.thread.x] * d[this.thread.x];
    }, { output: [5] });

    return gpu.combineKernels(kernel1, kernel2, function(array1, array2, array3) {
      return kernel2(kernel1(array1, array2), array3);
    });
  }

  QUnit.test("combineKernels (auto)", () => {
    const superKernel = combineKernels(null);
    const result = QUnit.extend([], superKernel([1,2,3,4,5], [1,2,3,4,5], [1,2,3,4,5]));
    QUnit.assert.deepEqual(result, [2, 8, 18, 32, 50]);
    gpu.destroy();
  });

  QUnit.test("combineKernels (gpu)", () => {
    const superKernel = combineKernels('gpu');
    const result = QUnit.extend([], superKernel([1,2,3,4,5], [1,2,3,4,5], [1,2,3,4,5]));
    QUnit.assert.deepEqual(result, [2, 8, 18, 32, 50]);
    gpu.destroy();
  });

  (GPU.isWebGLSupported ? QUnit.test : QUnit.skip)("combineKernels (webgl)", () => {
    const superKernel = combineKernels('webgl');
    const result = QUnit.extend([], superKernel([1, 2, 3, 4, 5], [1, 2, 3, 4, 5], [1, 2, 3, 4, 5]));
    QUnit.assert.deepEqual(result, [2, 8, 18, 32, 50]);
    gpu.destroy();
  });

  (GPU.isWebGL2Supported ? QUnit.test : QUnit.skip)("combineKernels (webgl2)", () => {
    const superKernel = combineKernels('webgl2');
    const result = QUnit.extend([], superKernel([1, 2, 3, 4, 5], [1, 2, 3, 4, 5], [1, 2, 3, 4, 5]));
    QUnit.assert.deepEqual(result, [2, 8, 18, 32, 50]);
    gpu.destroy();
  });

  (GPU.isHeadlessGLSupported ? QUnit.test : QUnit.skip)("combineKernels (headlessgl)", () => {
    const superKernel = combineKernels('headlessgl');
    const result = QUnit.extend([], superKernel([1, 2, 3, 4, 5], [1, 2, 3, 4, 5], [1, 2, 3, 4, 5]));
    QUnit.assert.deepEqual(result, [2, 8, 18, 32, 50]);
    gpu.destroy();
  });

  QUnit.test("combineKernels (cpu)", () => {
    const superKernel = combineKernels('cpu');
    const result = QUnit.extend([], superKernel([1,2,3,4,5], [1,2,3,4,5], [1,2,3,4,5]));
    QUnit.assert.deepEqual(result, [2, 8, 18, 32, 50]);
    gpu.destroy();
  });
})();
