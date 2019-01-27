(function() {
  const GPU = require('../../src/index');
  function funky(mode) {
    const gpu = new GPU({ mode: mode });
    gpu.addFunction(function add(value1, value2) {
      return value1 + value2;
    });
    const kernel = gpu.createKernel(`function(v1, v2) {
      return (0, _add.add)(v1[this.thread.y][this.thread.x], v2[this.thread.y][this.thread.x]);
    }`)
      .setOutput([2, 2]);

    const result = kernel([
      [0,1],
      [1,2]
    ], [
      [0,1],
      [1,2]
    ]);
    QUnit.assert.deepEqual(result.map((v) => Array.from(v)), [
      [0,2],
      [2,4]
    ]);
    gpu.destroy();
  }

  QUnit.test('Issue #212 - funky function support (auto)', () => {
    funky('gpu');
  });

  QUnit.test('Issue #212 - funky function support (gpu)', () => {
    funky('gpu');
  });

  (GPU.isWebGLSupported ? QUnit.test : QUnit.skip)('Issue #212 - funky function support (webgl)', () => {
    funky('webgl');
  });

  (GPU.isWebGL2Supported ? QUnit.test : QUnit.skip)('Issue #212 - funky function support (webgl2)', () => {
    funky('webgl2');
  });

  (GPU.isHeadlessGLSupported ? QUnit.test : QUnit.skip)('Issue #212 - funky function support (headlessgl)', () => {
    funky('headlessgl');
  });

  QUnit.test('Issue #212 - funky function support cpu', () => {
    funky('cpu');
  });
})();
