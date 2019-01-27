(() => {
  const GPU = require('../../src/index');
  function test(mode) {
    function mult2(scale) {
      return 2*scale;
    }

    const gpu = new GPU({
      mode: mode,
      functions: [mult2]
    });

    const render1 = gpu.createKernel(function(input) {
      return (mult2(input) + mult2(input*2) + mult2(input*1))	// RIGHT
    })
      .setOutput([1]);

    const render2 = gpu.createKernel(function(input) {
      return (mult2(input) + mult2(input*2) + mult2(input)); // WRONG
    })
      .setOutput([1]);

    QUnit.assert.equal(render1(1)[0], 8, 'render1 equals 8');
    QUnit.assert.equal(render2(1)[0], 8, 'render2 equals 8');
    gpu.destroy();
  }
  QUnit.test('Issue #313 Mismatch argument lookup - auto', () => {
    test();
  });
  QUnit.test('Issue #313 Mismatch argument lookup - gpu', () => {
    test('gpu');
  });
  (GPU.isWebGLSupported ? QUnit.test : QUnit.skip)('Issue #313 Mismatch argument lookup - webgl', () => {
    test('webgl');
  });
  (GPU.isWebGL2Supported ? QUnit.test : QUnit.skip)('Issue #313 Mismatch argument lookup - webgl2', () => {
    test('webgl2');
  });
  (GPU.isHeadlessGLSupported ? QUnit.test : QUnit.skip)('Issue #313 Mismatch argument lookup - headlessgl', () => {
    test('headlessgl');
  });
  QUnit.test('Issue #313 Mismatch argument lookup - cpu', () => {
    test('cpu');
  });
})();
