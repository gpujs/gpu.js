var GPU = require('../../src/index');
require('qunit-assert-close');

(function() {
  function forLoopTest(mode) {
    var gpu = new GPU({ mode: mode });
    var f = gpu.createKernel(function(a, b) {
      var x = 0;
      for(var i = 0; i < 10; i++) {
        x = x + 1;
      }

      return (a[this.thread.x] + b[this.thread.x] + x);
    }, {
      output : [6]
    });

    QUnit.assert.ok( f !== null, 'function generated test');

    var a = [1, 2, 3, 5, 6, 7];
    var b = [4, 5, 6, 1, 2, 3];

    var res = f(a,b);
    var exp = [15, 17, 19, 16, 18, 20];

    for(var i = 0; i < exp.length; ++i) {
      QUnit.assert.close(res[i], exp[i], 0.1, 'Result arr idx: '+i);
    }
    gpu.destroy();
  }

  QUnit.test( 'for_loop (auto)', function() {
    forLoopTest(null);
  });

  QUnit.test( 'for_loop (gpu)', function() {
    forLoopTest('gpu');
  });

  (GPU.isWebGlSupported() ? QUnit.test : QUnit.skip)('for_loop (webgl)', function () {
    forLoopTest('webgl');
  });

  (GPU.isWebGl2Supported() ? QUnit.test : QUnit.skip)('for_loop (webgl2)', function () {
    forLoopTest('webgl2');
  });

  (GPU.isHeadlessGlSupported() ? QUnit.test : QUnit.skip)('for_loop (headlessgl)', function () {
    forLoopTest('headlessgl');
  });

  QUnit.test( 'for_loop (cpu)', function() {
    forLoopTest('cpu');
  });

  function doWhileLoopTest(mode) {
    var gpu = new GPU({ mode: mode });
    var f = gpu.createKernel(function(a, b) {
      var x = 0;
      var i = 0;
      do{
        x = x + 1;
        i++;
      } while (i < 10);
      return (a[this.thread.x] + b[this.thread.x] + x);
    }, {
      output : [6]
    });

    QUnit.assert.ok( f !== null, 'function generated test');

    var a = [1, 2, 3, 5, 6, 7];
    var b = [4, 5, 6, 1, 2, 3];

    var res = f(a,b);
    var exp = [15, 17, 19, 16, 18, 20];

    for(var i = 0; i < exp.length; ++i) {
      QUnit.assert.close(res[i], exp[i], 0.1, 'Result arr idx: '+i);
    }
    gpu.destroy();
  }

  QUnit.test( 'dowhile_loop (auto)', function() {
    doWhileLoopTest(null);
  });

  QUnit.test( 'dowhile_loop (gpu)', function() {
    doWhileLoopTest('gpu');
  });

  (GPU.isWebGlSupported() ? QUnit.test : QUnit.skip)('dowhile_loop (webgl)', function () {
    doWhileLoopTest('webgl');
  });

  (GPU.isWebGl2Supported() ? QUnit.test : QUnit.skip)('dowhile_loop (webgl2)', function () {
    doWhileLoopTest('webgl2');
  });

  (GPU.isHeadlessGlSupported() ? QUnit.test : QUnit.skip)('dowhile_loop (headlessgl)', function () {
    doWhileLoopTest('headlessgl');
  });

  QUnit.test( 'dowhile_loop (cpu)', function() {
    doWhileLoopTest('cpu');
  });


  function evilWhileKernalFunction(a, b) {
    var x = 0.0;
    var i = 0;

    //10000000 or 10 million is the approx upper limit on a chrome + GTX 780
    while(i<100) {
      x = x + 1.0;
      ++i;
    }

    return (a[this.thread.x] + b[this.thread.x] + x);
  }

  var evil_while_a = [1, 2, 3, 5, 6, 7];
  var evil_while_b = [4, 5, 6, 1, 2, 3];

  function evilWhileLoopTest(mode ) {
    var evil_while_cpuRef = new GPU({ mode: 'cpu' });
    var evil_while_cpuRef_f =  evil_while_cpuRef.createKernel(evilWhileKernalFunction, {
      output : [6],
      loopMaxIterations: 10000
    });

    var evil_while_exp = evil_while_cpuRef_f(evil_while_a,evil_while_b);
    var gpu = new GPU({ mode: mode });

    var f = gpu.createKernel(evilWhileKernalFunction, {
      output : [6]
    });

    QUnit.assert.ok( f !== null, 'function generated test');

    var res = f(evil_while_a,evil_while_b);

    for(var i = 0; i < evil_while_exp.length; ++i) {
      QUnit.assert.close(evil_while_exp[i], res[i], 0.1, 'Result arr idx: '+i);
    }
    evil_while_cpuRef.destroy();
    gpu.destroy();
  }

  QUnit.test( 'evilWhileLoopTest (auto)', function() {
    evilWhileLoopTest(null);
  });

  QUnit.test( 'evilWhileLoopTest (gpu)', function() {
    evilWhileLoopTest('gpu');
  });

  (GPU.isWebGlSupported() ? QUnit.test : QUnit.skip)('evilWhileLoopTest (webgl)', function () {
    evilWhileLoopTest('webgl');
  });

  (GPU.isWebGl2Supported() ? QUnit.test : QUnit.skip)('evilWhileLoopTest (webgl2)', function () {
    evilWhileLoopTest('webgl2');
  });

  (GPU.isHeadlessGlSupported() ? QUnit.test : QUnit.skip)('evilWhileLoopTest (headlessgl)', function () {
    evilWhileLoopTest('headlessgl');
  });

  QUnit.test( 'evilWhileLoopTest (CPU)', function() {
    evilWhileLoopTest('cpu');
  });


  function forConstantLoopTest(mode) {
    var gpu = new GPU({ mode: mode });
    var f = gpu.createKernel(function(a, b) {
      var x = 0;
      for(var i = 0; i < this.constants.max; i++) {
        x = x + 1;
      }

      return (a[this.thread.x] + b[this.thread.x] + x);
    }, {
      output : [6],
      constants: {
        max: 10
      }
    });

    QUnit.assert.ok( f !== null, 'function generated test');

    var a = [1, 2, 3, 5, 6, 7];
    var b = [4, 5, 6, 1, 2, 3];

    var res = f(a,b);
    var exp = [15, 17, 19, 16, 18, 20];

    for(var i = 0; i < exp.length; ++i) {
      QUnit.assert.close(res[i], exp[i], 0.1, 'Result arr idx: '+i);
    }
    gpu.destroy();
  }

  QUnit.test( 'forConstantLoopTest (auto)', function() {
    forConstantLoopTest(null);
  });

  QUnit.test( 'forConstantLoopTest (gpu)', function() {
    forConstantLoopTest('gpu');
  });

  (GPU.isWebGlSupported() ? QUnit.test : QUnit.skip)('forConstantLoopTest (webgl)', function () {
    forConstantLoopTest('webgl');
  });

  (GPU.isWebGl2Supported() ? QUnit.test : QUnit.skip)('forConstantLoopTest (webgl2)', function () {
    forConstantLoopTest('webgl2');
  });

  (GPU.isHeadlessGlSupported() ? QUnit.test : QUnit.skip)('forConstantLoopTest (headlessgl)', function () {
    forConstantLoopTest('headlessgl');
  });

  QUnit.test( 'forConstantLoopTest (CPU)', function() {
    forConstantLoopTest('cpu');
  });
})();
