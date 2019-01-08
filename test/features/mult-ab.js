(function() {
  function multABTest(mode) {
    var gpu = new GPU({ mode });
    var f = gpu.createKernel(function(a, b) {
      var sum = 0;
      sum += a[this.thread.y][0] * b[0][this.thread.x];
      sum += a[this.thread.y][1] * b[1][this.thread.x];
      sum += a[this.thread.y][2] * b[2][this.thread.x];
      return sum;
    }, {
      output : [3, 3]
    });
  
    QUnit.assert.ok( f !== null, 'function generated test');
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
  
  QUnit.test( 'multAB (auto)', function() {
    multABTest(null);
  });
  QUnit.test( 'multAB (gpu)', function() {
    multABTest('gpu');
  });
  QUnit.test( 'multAB (webgl)', function() {
    multABTest('webgl');
  });
  QUnit.test( 'multAB (webgl2)', function() {
    multABTest('webgl2');
  });
  QUnit.test( 'multAB (CPU)', function() {
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
      QUnit.assert.close(res[i], exp[i], 0.1, 'Result arr idx: '+i);
    }
    gpu.destroy();
  }
  
  QUnit.test( 'sqrtAB (auto)', function() {
    sqrtABTest(null);
  });

  QUnit.test( 'sqrtAB (gpu)', function() {
    sqrtABTest('gpu');
  });

  QUnit.test( 'sqrtAB (webgl)', function() {
    sqrtABTest('webgl');
  });

  QUnit.test( 'sqrtAB (webgl2)', function() {
    sqrtABTest('webgl2');
  });
  
  QUnit.test( 'sqrtAB (CPU)', function() {
    sqrtABTest('cpu');
  });
})();
