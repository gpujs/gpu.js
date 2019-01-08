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
    var expected = new Float32Array([200, 200]);
    QUnit.assert.deepEqual(result, expected, 'texture constant passed test');
    gpu.destroy();
  }

  QUnit.test( 'textureConstantTest (auto)', function() {
    var mode = null;
    textureConstantTest(mode);
  });

  QUnit.test( 'textureConstantTest (gpu)', function() {
    var mode = 'gpu';
    textureConstantTest(mode);
  });

  QUnit.test( 'textureConstantTest (webgl)', function() {
    var mode = 'webgl';
    textureConstantTest(mode);
  });

  QUnit.test( 'textureConstantTest (webgl2)', function() {
    var mode = 'webgl2';
    textureConstantTest(mode);
  });

  QUnit.test( 'textureConstantTest (cpu)', function() {
    var mode = 'cpu';
    textureConstantTest(mode);
  });
})();

(function() {
  function texture2DConstantTest(mode) {
    var gpu = new GPU({ mode: mode });
    var createTexture = gpu
      .createKernel(function() {
        return 200;
      })
      .setOutput([2, 2])
      .setOutputToTexture(true);
    var texture = createTexture();
    var tryConst = gpu.createKernel(
      function() {
        return this.constants.texture[this.thread.y][this.thread.x];
      },
      {
        constants: { texture }
      }
    ).setOutput([2, 2]);
    var result = tryConst();
    var expected = [new Float32Array([200, 200]), new Float32Array([200, 200])];
    QUnit.assert.deepEqual(result, expected, 'texture constant passed test');
    gpu.destroy();
  }

  QUnit.test( 'texture2DConstantTest (auto)', function() {
    var mode = null;
    texture2DConstantTest(mode);
  });

  QUnit.test( 'texture2DConstantTest (gpu)', function() {
    var mode = 'gpu';
    texture2DConstantTest(mode);
  });

  QUnit.test( 'texture2DConstantTest (webgl)', function() {
    var mode = 'webgl';
    texture2DConstantTest(mode);
  });

  QUnit.test( 'texture2DConstantTest (webgl2)', function() {
    var mode = 'webgl2';
    texture2DConstantTest(mode);
  });

  QUnit.test( 'texture2DConstantTest (cpu)', function() {
    var mode = 'cpu';
    texture2DConstantTest(mode);
  });
})();

(function() {
  function texture3DConstantTest(mode) {
    var gpu = new GPU({ mode: mode });
    var createTexture = gpu
      .createKernel(function() {
        return 200;
      })
      .setOutput([2, 2, 2])
      .setOutputToTexture(true);
    var texture = createTexture();
    var tryConst = gpu.createKernel(
      function() {
        return this.constants.texture[this.thread.z][this.thread.y][this.thread.x];
      },
      {
        constants: { texture }
      }
    ).setOutput([2, 2, 2]);
    var result = tryConst();
    var expected = [[new Float32Array([200, 200]), new Float32Array([200, 200])],[new Float32Array([200, 200]), new Float32Array([200, 200])]];
    QUnit.assert.deepEqual(result, expected, 'texture constant passed test');
    gpu.destroy();
  }

  QUnit.test( 'texture3DConstantTest (auto)', function() {
    var mode = null;
    texture3DConstantTest(mode);
  });

  QUnit.test( 'texture3DConstantTest (gpu)', function() {
    var mode = 'gpu';
    texture3DConstantTest(mode);
  });

  QUnit.test( 'texture3DConstantTest (webgl)', function() {
    var mode = 'webgl';
    texture3DConstantTest(mode);
  });

    QUnit.test( 'texture3DConstantTest (webgl2)', function() {
    var mode = 'webgl2';
    texture3DConstantTest(mode);
  });

  QUnit.test( 'texture3DConstantTest (cpu)', function() {
    var mode = 'cpu';
    texture3DConstantTest(mode);
  });
})();