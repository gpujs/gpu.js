var GPU = require('../../src/index');
require('qunit-assert-close');

(function() {
  function booleanBranch(mode) {
    var gpu = new GPU({
      mode: mode
    });
    var f = gpu.createKernel(function() {
      var result = 0;
      if(true) {
        result = 4;
      } else {
        result = 2;
      }
      return result;
    }, {
      output : [1]
    });

    QUnit.assert.ok( f !== null, 'function generated test');
    QUnit.assert.close(f()[0], 4, 0.01, 'basic return function test');
    gpu.destroy();
  }

  QUnit.test( 'booleanBranch (auto)', function() {
    booleanBranch(null);
  });

  QUnit.test( 'booleanBranch (gpu)', function() {
    booleanBranch('gpu');
  });

  (GPU.isWebGlSupported() ? QUnit.test : QUnit.skip)('booleanBranch (webgl)', function () {
    booleanBranch('webgl');
  });

  (GPU.isWebGl2Supported() ? QUnit.test : QUnit.skip)('booleanBranch (webgl2)', function () {
    booleanBranch('webgl2');
  });

  (GPU.isHeadlessGlSupported() ? QUnit.test : QUnit.skip)('booleanBranch (headlessgl)', function () {
    booleanBranch('headlessgl');
  });

  QUnit.test( 'booleanBranch (CPU)', function() {
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

  QUnit.test( 'ifElse (auto)', function() {
    ifElse(null);
  });

  QUnit.test( 'ifElse (gpu)', function() {
    ifElse('gpu');
  });

  (GPU.isWebGlSupported() ? QUnit.test : QUnit.skip)('ifElse (webgl)', function () {
    ifElse('webgl');
  });

  (GPU.isWebGl2Supported() ? QUnit.test : QUnit.skip)('ifElse (webgl2)', function () {
    ifElse('webgl2');
  });

  (GPU.isHeadlessGlSupported() ? QUnit.test : QUnit.skip)('ifElse (headlessgl)', function () {
    ifElse('headlessgl');
  });

  QUnit.test( 'ifElse (cpu)', function() {
    ifElse('cpu');
  });
})();
