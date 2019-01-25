(function() {
  const GPU = require('../../src/index');
  function booleanBranch(mode) {
    const gpu = new GPU({
      mode: mode
    });
    const f = gpu.createKernel(function() {
      let result = 0;
      if (true) {
        result = 4;
      } else {
        result = 2;
      }
      return result;
    }, {
      output : [1]
    });

    QUnit.assert.ok( f !== null, 'function generated test');
    QUnit.assert.equal(f()[0], 4, 'basic return function test');
    gpu.destroy();
  }

  QUnit.test('booleanBranch (auto)', () => {
    booleanBranch(null);
  });

  QUnit.test('booleanBranch (gpu)', () => {
    booleanBranch('gpu');
  });

  (GPU.isWebGLSupported ? QUnit.test : QUnit.skip)('booleanBranch (webgl)', () => {
    booleanBranch('webgl');
  });

  (GPU.isWebGL2Supported ? QUnit.test : QUnit.skip)('booleanBranch (webgl2)', () => {
    booleanBranch('webgl2');
  });

  (GPU.isHeadlessGLSupported ? QUnit.test : QUnit.skip)('booleanBranch (headlessgl)', () => {
    booleanBranch('headlessgl');
  });

  QUnit.test('booleanBranch (CPU)', () => {
    booleanBranch('cpu');
  });


  function ifElse( mode ) {
    var gpu = new GPU({ mode });
    var f = gpu.createKernel(function(x) {
      if (x[this.thread.x] > 0) {
        return 0;
      } else {
        return 1;
      }
    }, {
      output : [4]
    });

    QUnit.assert.ok( f !== null, 'function generated test');
    QUnit.assert.deepEqual(QUnit.extend([], f([1, 1, 0, 0])), [0, 0, 1, 1], 'basic return function test');
    gpu.destroy();
  }

  QUnit.test('ifElse (auto)', () => {
    ifElse(null);
  });

  QUnit.test('ifElse (gpu)', () => {
    ifElse('gpu');
  });

  (GPU.isWebGLSupported ? QUnit.test : QUnit.skip)('ifElse (webgl)', () => {
    ifElse('webgl');
  });

  (GPU.isWebGL2Supported ? QUnit.test : QUnit.skip)('ifElse (webgl2)', () => {
    ifElse('webgl2');
  });

  (GPU.isHeadlessGLSupported ? QUnit.test : QUnit.skip)('ifElse (headlessgl)', () => {
    ifElse('headlessgl');
  });

  QUnit.test('ifElse (cpu)', () => {
    ifElse('cpu');
  });
})();
