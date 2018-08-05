(function() {
  function booleanBranch(mode) {
    var gpu = new GPU({
      mode: mode
    });
    var f = gpu.createKernel(function() {
      var result = 0.0;
      if(true) {
        result = 4.0;
      } else {
        result = 2.0;
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
  
  QUnit.test( 'booleanBranch (webgl)', function() {
    booleanBranch('webgl');
  });

  QUnit.test( 'booleanBranch (webgl2)', function() {
    booleanBranch('webgl2');
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

  QUnit.test( 'ifElse (webgl)', function() {
    ifElse('webgl');
  });

  QUnit.test( 'ifElse (webgl2)', function() {
    ifElse('webgl2');
  });

  QUnit.test( 'ifElse (cpu)', function() {
    ifElse('cpu');
  });
})();