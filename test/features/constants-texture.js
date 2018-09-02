(function() {
  function textureConstantTest(mode) {
    var gpu = new GPU({ mode: mode });
    var createTexture = gpu
      .createKernel(function() {
        return 200;
      })
      .setOutput([2])
      .setOutputToTexture(true);
    var texture = createTexture();
    var tryConst = gpu.createKernel(
      function() {
        return this.constants.texture[this.thread.x];
      },
      {
        constants: { texture }
      }
    ).setOutput([2]);
    var result = tryConst();
    var match = new Float32Array([200, 200]);
    var test = (result[0] === match[0] && result[1] === match[1]);
    QUnit.assert.ok(test, 'texture constant passed test');
    tryConst.destroy();
  }

  QUnit.test( 'textureConstantTest (auto)', function(assert) {
    var mode = null;
    textureConstantTest(mode);
  });

  QUnit.test( 'textureConstantTest (gpu)', function(assert) {
    var mode = 'gpu';
    textureConstantTest(mode);
  });

  QUnit.test( 'textureConstantTest (webgl)', function(assert) {
    var mode = 'webgl';
    textureConstantTest(mode);
  });

  QUnit.test( 'textureConstantTest (webgl2)', function(assert) {
    var mode = 'webgl2';
    textureConstantTest(mode);
  });

  QUnit.test( 'textureConstantTest (cpu)', function(assert) {
    var mode = 'cpu';
    textureConstantTest(mode);
  });
})();
