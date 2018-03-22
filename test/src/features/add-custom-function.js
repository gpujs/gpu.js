(function() {
  function addCustomFunction_sumAB(mode) {
    var gpu = new GPU({ mode: mode });

    function custom_adder(a,b) {
      return a+b;
    }

    var f = gpu.createKernel(function(a, b) {
      return custom_adder(a[this.thread.x], b[this.thread.x]);
    }, {
      functions: [custom_adder],
      output : [6]
    });

    QUnit.assert.ok( f !== null, 'function generated test');

    var a = [1, 2, 3, 5, 6, 7];
    var b = [4, 5, 6, 1, 2, 3];

    var res = f(a,b);
    var exp = [5, 7, 9, 6, 8, 10];

    for(var i = 0; i < exp.length; ++i) {
      QUnit.assert.close(res[i], exp[i], 0.1, 'Result arr idx: '+i);
    }
  }

  QUnit.test( 'addCustomFunction_sumAB (auto)', function() {
    addCustomFunction_sumAB(null);
  });

  QUnit.test( 'addCustomFunction_sumAB (gpu)', function() {
    addCustomFunction_sumAB('gpu');
  });

  QUnit.test( 'addCustomFunction_sumAB (webgl)', function() {
    addCustomFunction_sumAB('webgl');
  });

  QUnit.test( 'addCustomFunction_sumAB (webgl2)', function() {
    addCustomFunction_sumAB('webgl2');
  });

  QUnit.test( 'addCustomFunction_sumAB (cpu)', function() {
    addCustomFunction_sumAB('cpu');
  });


  function addCustomFunction_constantsWidth(mode) {
    var gpu = new GPU({ mode: mode });

    function custom_adder(a, b) {
      var sum = 0;
      for (var i = 0; i < this.constants.width; i++) {
        sum += (a[this.thread.x] + b[this.thread.x]);
      }
      return sum;
    }

    var f = gpu.createKernel(function(a, b) {
      return custom_adder(a, b);
    }, {
      functions: [custom_adder],
      output : [6],
      constants: { width: 6 }
    });

    QUnit.assert.ok( f !== null, 'function generated test');

    var a = [1, 2, 3, 5, 6, 7];
    var b = [1, 1, 1, 1, 1, 1];

    var res = f(a,b);
    var exp = [12, 18, 24, 36, 42, 48];

    for(var i = 0; i < exp.length; ++i) {
      QUnit.assert.close(res[i], exp[i], 0.1, 'Result arr idx: '+i);
    }
  }

  QUnit.test('addCustomFunction_constantsWidth (auto)', function() {
    addCustomFunction_constantsWidth(null);
  });

  QUnit.test('addCustomFunction_constantsWidth (gpu)', function() {
    addCustomFunction_constantsWidth('gpu');
  });

  QUnit.test('addCustomFunction_constantsWidth (webgl)', function() {
    addCustomFunction_constantsWidth('webgl');
  });

  QUnit.test('addCustomFunction_constantsWidth (webgl2)', function() {
    addCustomFunction_constantsWidth('webgl2');
  });

  QUnit.test('addCustomFunction_constantsWidth (cpu)', function() {
    addCustomFunction_constantsWidth('cpu');
  });

  function addCustomFunction_thisOutputX(mode) {
    var gpu = new GPU({ mode: mode });

    function custom_adder(a, b) {
      var sum = 0;
      for (var i = 0; i < this.output.x; i++) {
        sum += (a[this.thread.x] + b[this.thread.x]);
      }
      return sum;
    }

    var f = gpu.createKernel(function(a, b) {
      return custom_adder(a, b);
    }, {
      functions: [custom_adder],
      output : [6]
    });

    QUnit.assert.ok( f !== null, 'function generated test');

    var a = [1, 2, 3, 5, 6, 7];
    var b = [1, 1, 1, 1, 1, 1];

    var res = f(a,b);
    var exp = [12, 18, 24, 36, 42, 48];

    for(var i = 0; i < exp.length; ++i) {
      QUnit.assert.close(res[i], exp[i], 0.1, 'Result arr idx: '+i);
    }
  }

  QUnit.test('addCustomFunction_thisOutputX (auto)', function() {
    addCustomFunction_thisOutputX(null);
  });

  QUnit.test('addCustomFunction_thisOutputX (gpu)', function() {
    addCustomFunction_thisOutputX('gpu');
  });

  QUnit.test('addCustomFunction_thisOutputX (webgl)', function() {
    addCustomFunction_thisOutputX('webgl');
  });

  QUnit.test('addCustomFunction_thisOutputX (webgl2)', function() {
    addCustomFunction_thisOutputX('webgl2');
  });

  QUnit.test('addCustomFunction_thisOutputX (cpu)', function() {
    addCustomFunction_thisOutputX('cpu');
  });
})();