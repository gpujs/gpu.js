(function() {
  function arrayConstantTest(mode) {
    var gpu = new GPU({ mode: mode });
    var array = [200, 200];
    var tryConst = gpu.createKernel(
      function() {
        return this.constants.array[this.thread.x];
      },
      {
        constants: { array }
      }
    ).setOutput([2]);
    var result = tryConst();
    var match = new Float32Array([200, 200]);
    var test = (result[0] === match[0] && result[1] === match[1]);
    QUnit.assert.ok(test, 'array constant passed test');
    tryConst.destroy();
  }

  QUnit.test( 'arrayConstantTest (auto)', function(assert) {
    var mode = null;
    arrayConstantTest(mode);
  });

  QUnit.test( 'arrayConstantTest (gpu)', function(assert) {
    var mode = 'gpu';
    arrayConstantTest(mode);
  });

  QUnit.test( 'arrayConstantTest (webgl)', function(assert) {
    var mode = 'webgl';
    arrayConstantTest(mode);
  });

  QUnit.test( 'arrayConstantTest (webgl2)', function(assert) {
    var mode = 'webgl2';
    arrayConstantTest(mode);
  });

  QUnit.test( 'arrayConstantTest (cpu)', function(assert) {
    var mode = 'cpu';
    arrayConstantTest(mode);
  });
})();
