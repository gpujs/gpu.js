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
    var tryTextureConstant = gpu.createKernel(
      function() {
        return this.constants.texture[this.thread.x];
      },
      {
        constants: { texture }
      }
    )
    .setOutput([2]);
    var result = tryTextureConstant();
    var match = new Float32Array([200, 200]);
    var test = (result[0] === match[0] && result[1] === match[1]);
    console.log('Result: ', result);
    console.log('Match: ', match);
    console.log('Test: ', test);
    QUnit.assert.ok(test, 'texture constant passed test');
    tryTextureConstant.destroy();
  }

  QUnit.test( 'textureConstantTest (auto)', function() {
    textureConstantTest(null);
  });

  QUnit.test( 'textureConstantTest (gpu)', function() {
    textureConstantTest('gpu');
  });

  QUnit.test( 'textureConstantTest (webgl)', function() {
    textureConstantTest('webgl');
  });

  QUnit.test( 'textureConstantTest (webgl2)', function() {
    textureConstantTest('webgl2');
  });

  QUnit.test( 'textureConstantTest (cpu)', function() {
    textureConstantTest('cpu');
  });
})();
