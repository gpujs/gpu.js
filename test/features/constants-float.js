(function() {
  function floatConstantTest(mode) {
    var gpu = new GPU({ mode: mode });
    var float = 200.01;
    var tryConst = gpu.createKernel(
      function() {
        return this.constants.float;
      },
      {
        constants: { float }
      }
    ).setOutput([2]);
    var result = tryConst();
    var match = new Float32Array([200.01, 200.01]);
    var test = (
      result[0].toFixed(1) === match[0].toFixed(1)
      && result[1].toFixed(1) === match[1].toFixed(1)
    );
    QUnit.assert.ok(test, 'float constant passed test');
    gpu.destroy();
  }

  QUnit.test( 'floatConstantTest (auto)', function() {
    var mode = null;
    floatConstantTest(mode);
  });

  QUnit.test( 'floatConstantTest (gpu)', function() {
    var mode = 'gpu';
    floatConstantTest(mode);
  });

  QUnit.test( 'floatConstantTest (webgl)', function() {
    var mode = 'webgl';
    floatConstantTest(mode);
  });

  QUnit.test( 'floatConstantTest (webgl2)', function() {
    var mode = 'webgl2';
    floatConstantTest(mode);
  });

  QUnit.test( 'floatConstantTest (cpu)', function() {
    var mode = 'cpu';
    floatConstantTest(mode);
  });
})();
