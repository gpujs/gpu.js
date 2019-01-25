(() => {
  const GPU = require('../../src/index');
  function test(mode) {
    const gpu = new GPU({ mode });
    const kernel = gpu.createKernel(function(changes) {
      return changes[this.thread.y][this.thread.x];
    })
      .setOutput([2, 1]);

    const values = [new Float32Array(2)];
    values[0][0] = 0;
    values[0][1] = 0;
    const result = kernel(values);
    QUnit.assert.equal(result[0][0], 0);
    QUnit.assert.equal(result[0][1], 0);
    gpu.destroy();
  }

  QUnit.test("Issue #130 - typed array (auto)", () => {
    test(null);
  });

  QUnit.test("Issue #130 - typed array (gpu)", () => {
    test('gpu');
  });

  (GPU.isWebGLSupported ? QUnit.test : QUnit.skip)("Issue #130 - typed array (webgl)", () => {
    test('webgl');
  });

  (GPU.isWebGL2Supported ? QUnit.test : QUnit.skip)("Issue #130 - typed array (webgl2)", () => {
    test('webgl2');
  });

  (GPU.isHeadlessGLSupported ? QUnit.test : QUnit.skip)("Issue #130 - typed array (headlessgl)", () => {
    test('headlessgl');
  });

  QUnit.test("Issue #130 - typed array (cpu)", () => {
    test('cpu');
  });
})();
