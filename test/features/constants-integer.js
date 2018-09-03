(function() {
  function integerConstantTest(mode) {
    var gpu = new GPU({ mode: mode });
    var int = 200;
    var tryConst = gpu.createKernel(
      function() {
        return this.constants.int;
      },
      {
        constants: { int }
      }
    ).setOutput([2]);
    var result = tryConst();
    var match = new Float32Array([200, 200]);
    var test = (result[0] === match[0] && result[1] === match[1]);
    QUnit.assert.ok(test, 'int constant passed test');
    tryConst.destroy();
  }

  QUnit.test( 'integerConstantTest (auto)', function(assert) {
    var mode = null;
    integerConstantTest(mode);
  });

  QUnit.test( 'integerConstantTest (gpu)', function(assert) {
    var mode = 'gpu';
    integerConstantTest(mode);
  });

  QUnit.test( 'integerConstantTest (webgl)', function(assert) {
    var mode = 'webgl';
    integerConstantTest(mode);
  });

  QUnit.test( 'integerConstantTest (webgl2)', function(assert) {
    var mode = 'webgl2';
    integerConstantTest(mode);
  });

  QUnit.test( 'integerConstantTest (cpu)', function(assert) {
    var mode = 'cpu';
    integerConstantTest(mode);
  });
})();
