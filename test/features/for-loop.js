(function() {
  const GPU = require('../../src/index');
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
      QUnit.assert.equal(res[i], exp[i], 'Result arr idx: '+i);
    }
    gpu.destroy();
  }

  QUnit.test('for_loop (auto)', () => {
    forLoopTest(null);
  });

  QUnit.test('for_loop (gpu)', () => {
    forLoopTest('gpu');
  });

  (GPU.isWebGLSupported ? QUnit.test : QUnit.skip)('for_loop (webgl)', () => {
    forLoopTest('webgl');
  });

  (GPU.isWebGL2Supported ? QUnit.test : QUnit.skip)('for_loop (webgl2)', () => {
    forLoopTest('webgl2');
  });

  (GPU.isHeadlessGLSupported ? QUnit.test : QUnit.skip)('for_loop (headlessgl)', () => {
    forLoopTest('headlessgl');
  });

  QUnit.test('for_loop (cpu)', () => {
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
      QUnit.assert.equal(res[i], exp[i], 0.1, 'Result arr idx: '+i);
    }
    gpu.destroy();
  }

  QUnit.test('dowhile_loop (auto)', () => {
    doWhileLoopTest(null);
  });

  QUnit.test('dowhile_loop (gpu)', () => {
    doWhileLoopTest('gpu');
  });

  (GPU.isWebGLSupported ? QUnit.test : QUnit.skip)('dowhile_loop (webgl)', () => {
    doWhileLoopTest('webgl');
  });

  (GPU.isWebGL2Supported ? QUnit.test : QUnit.skip)('dowhile_loop (webgl2)', () => {
    doWhileLoopTest('webgl2');
  });

  (GPU.isHeadlessGLSupported ? QUnit.test : QUnit.skip)('dowhile_loop (headlessgl)', () => {
    doWhileLoopTest('headlessgl');
  });

  QUnit.test('dowhile_loop (cpu)', () => {
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
      QUnit.assert.equal(evil_while_exp[i], res[i], 'Result arr idx: '+i);
    }
    evil_while_cpuRef.destroy();
    gpu.destroy();
  }

  QUnit.test('evilWhileLoopTest (auto)', () => {
    evilWhileLoopTest(null);
  });

  QUnit.test('evilWhileLoopTest (gpu)', () => {
    evilWhileLoopTest('gpu');
  });

  (GPU.isWebGLSupported ? QUnit.test : QUnit.skip)('evilWhileLoopTest (webgl)', () => {
    evilWhileLoopTest('webgl');
  });

  (GPU.isWebGL2Supported ? QUnit.test : QUnit.skip)('evilWhileLoopTest (webgl2)', () => {
    evilWhileLoopTest('webgl2');
  });

  (GPU.isHeadlessGLSupported ? QUnit.test : QUnit.skip)('evilWhileLoopTest (headlessgl)', () => {
    evilWhileLoopTest('headlessgl');
  });

  QUnit.test('evilWhileLoopTest (CPU)', () => {
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
      QUnit.assert.equal(res[i], exp[i], 0.1, 'Result arr idx: '+i);
    }
    gpu.destroy();
  }

  QUnit.test('forConstantLoopTest (auto)', () => {
    forConstantLoopTest(null);
  });

  QUnit.test('forConstantLoopTest (gpu)', () => {
    forConstantLoopTest('gpu');
  });

  (GPU.isWebGLSupported ? QUnit.test : QUnit.skip)('forConstantLoopTest (webgl)', () => {
    forConstantLoopTest('webgl');
  });

  (GPU.isWebGL2Supported ? QUnit.test : QUnit.skip)('forConstantLoopTest (webgl2)', () => {
    forConstantLoopTest('webgl2');
  });

  (GPU.isHeadlessGLSupported ? QUnit.test : QUnit.skip)('forConstantLoopTest (headlessgl)', () => {
    forConstantLoopTest('headlessgl');
  });

  QUnit.test('forConstantLoopTest (CPU)', () => {
    forConstantLoopTest('cpu');
  });
})();
