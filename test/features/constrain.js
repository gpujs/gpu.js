(function() {
  function constrainTest(mode) {
    var gpu = new GPU({ mode: mode });
    var f = gpu.createKernel(function() {
      return 255;
    }, {
      output : [6, 6, 6]
    });
    let x = 2;
    let y = 2;
    let z = 2;
    let width = 2;
    let height = 2;
    let depth = 3;
    f.constrain({x, y, z}, [width,height,depth]);
    let result = f();
    QUnit.assert.deepValueEqual(QUnit.extend([], result), [[[255, 255, 255], [255, 255, 255]][[255, 255, 255], [255, 255, 255]]]);
    gpu.destroy();
  }

  QUnit.test('constrain (auto)', function() {
  	constrainTest(null);
  });

  QUnit.test('constrain (gpu)', function() {
  	constrainTest('gpu');
  });

  QUnit.test('constrain (webgl)', function() {
    constrainTest('webgl');
  });

  QUnit.test('constrain (webgl2)', function() {
    constrainTest('webgl2');
  });

  QUnit.test('constrain (CPU)', function() {
    constrainTest('cpu');
  });
})();
