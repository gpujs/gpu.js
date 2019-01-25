(() => {
  const GPU = require('../../src/index');
  function multABTest(mode) {
    const gpu = new GPU({ mode });
    const f = gpu.createKernel(function(a, b) {
      let sum = 0;
      sum += a[this.thread.y][0] * b[0][this.thread.x];
      sum += a[this.thread.y][1] * b[1][this.thread.x];
      sum += a[this.thread.y][2] * b[2][this.thread.x];
      return sum;
    }, {
      output : [3, 3]
    });

    QUnit.assert.ok(f !== null, 'function generated test');
    QUnit.assert.deepEqual(f(
      [
        [1, 2, 3],
        [4, 5, 6],
        [7, 8, 9]
      ],
      [
        [1, 2, 3],
        [4, 5, 6],
        [7, 8, 9]
      ]).map(function(object) { return QUnit.extend([], object); }),
      [
        [30, 36, 42],
        [66, 81, 96],
        [102, 126, 150]
      ],
      'basic mult function test'
    );
    gpu.destroy();
  }

  QUnit.test('multAB (auto)', () => {
    multABTest(null);
  });
  QUnit.test('multAB (gpu)', () => {
    multABTest('gpu');
  });
  (GPU.isWebGLSupported ? QUnit.test : QUnit.skip)('multAB (webgl)', () => {
    multABTest('webgl');
  });
  (GPU.isWebGL2Supported ? QUnit.test : QUnit.skip)('multAB (webgl2)', () => {
    multABTest('webgl2');
  });
  (GPU.isHeadlessGLSupported ? QUnit.test : QUnit.skip)('multAB (headlessgl)', () => {
    multABTest('headlessgl');
  });
  QUnit.test('multAB (CPU)', () => {
    multABTest('cpu');
  });

  function sqrtABTest(mode) {
    var gpu = new GPU({ mode: mode });
    var f = gpu.createKernel(function(a, b) {
      return Math.sqrt(a[ this.thread.x ] * b[ this.thread.x ]);
    }, {
      output : [6]
    });

    QUnit.assert.ok(f !== null, 'function generated test');

    var a = [3, 4, 5, 6, 7, 8];
    var b = [3, 4, 5, 6, 7, 8];

    var res = f(a,b);
    var exp = [3, 4, 5, 6, 7, 8];

    for(var i = 0; i < exp.length; ++i) {
      QUnit.assert.equal(res[i], exp[i], 'Result arr idx: '+i);
    }
    gpu.destroy();
  }

  QUnit.test('sqrtAB (auto)', () => {
    sqrtABTest(null);
  });

  QUnit.test('sqrtAB (gpu)', () => {
    sqrtABTest('gpu');
  });

  (GPU.isWebGLSupported ? QUnit.test : QUnit.skip)('sqrtAB (webgl)', () => {
    sqrtABTest('webgl');
  });

  (GPU.isWebGL2Supported ? QUnit.test : QUnit.skip)('sqrtAB (webgl2)', () => {
    sqrtABTest('webgl2');
  });

  (GPU.isHeadlessGLSupported ? QUnit.test : QUnit.skip)('sqrtAB (headlessgl)', () => {
    sqrtABTest('headlessgl');
  });

  QUnit.test('sqrtAB (CPU)', () => {
    sqrtABTest('cpu');
  });
})();
