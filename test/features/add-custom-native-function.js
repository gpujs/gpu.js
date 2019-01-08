(function() {
  var glslDivide = `float divide(float a, float b) {
    return a / b;
  }`;
  var jsDivide = `function divide(a, b) {
    return a / b;
  }`;

  function addCustomNativeFunctionDivide(mode, fn) {
    var gpu = new GPU({ mode: mode });

    gpu.addNativeFunction('divide', fn);

    var f = gpu.createKernel(function(a, b) {
      return divide(a[this.thread.x], b[this.thread.x]);
    }, {
      output : [6]
    });

    QUnit.assert.ok( f !== null, 'function generated test');

    var a = [1, 2, 3, 5, 6, 7];
    var b = [4, 5, 6, 1, 2, 3];

    var res = f(a,b);
    var exp = [0.25, 0.4, 0.5, 5, 3, 2.33];

    for(var i = 0; i < exp.length; ++i) {
      QUnit.assert.close(res[i], exp[i], 0.1, 'Result arr idx: '+i);
    }
    gpu.destroy();
  }

  QUnit.test( 'addCustomNativeFunctionDivide (auto)', function() {
    addCustomNativeFunctionDivide(null, glslDivide);
  });

  QUnit.test( 'addCustomNativeFunctionDivide (gpu)', function() {
    addCustomNativeFunctionDivide('gpu', glslDivide);
  });

  QUnit.test( 'addCustomNativeFunctionDivide (webgl)', function() {
    addCustomNativeFunctionDivide('webgl', glslDivide);
  });

  QUnit.test( 'addCustomNativeFunctionDivide (webgl2)', function() {
    addCustomNativeFunctionDivide('webgl2', glslDivide);
  });

  QUnit.test( 'addCustomNativeFunctionDivide (cpu)', function() {
    addCustomNativeFunctionDivide('cpu', jsDivide);
  });

  function addCustomNativeFunctionDivideFallback(mode) {
    var gpu = new GPU({ mode: mode });

    gpu.addNativeFunction('divide', `float divide(float a, float b) {
    return a / b;
  }`);

    function divide(a,b) {
      return a / b;
    }

    var f = gpu.createKernel(function(a, b) {
      return divide(a[this.thread.x], b[this.thread.x]);
    }, {
      functions: [divide],
      output : [6]
    });

    QUnit.assert.ok( f !== null, 'function generated test');

    var a = [1, 2, 3, 5, 6, 7];
    var b = [4, 5, 6, 1, 2, 3];

    var res = f(a,b);
    var exp = [0.25, 0.4, 0.5, 5, 3, 2.33];

    for(var i = 0; i < exp.length; ++i) {
      QUnit.assert.close(res[i], exp[i], 0.1, 'Result arr idx: '+i);
    }
    gpu.destroy();
  }

  QUnit.test( 'addCustomNativeFunctionDivideFallback (GPU only) (auto)', function() {
    addCustomNativeFunctionDivideFallback(null);
  });

  QUnit.test( 'addCustomNativeFunctionDivideFallback (GPU only) (gpu)', function() {
    addCustomNativeFunctionDivideFallback('gpu');
  });

  QUnit.test( 'addCustomNativeFunctionDivideFallback (GPU only) (webgl)', function() {
    addCustomNativeFunctionDivideFallback('webgl');
  });

  QUnit.test( 'addCustomNativeFunctionDivideFallback (GPU only) (webgl2)', function() {
    addCustomNativeFunctionDivideFallback('webgl2');
  });
})();