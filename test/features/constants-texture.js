var GPU = require('../../src/index');

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
    textureConstantTest(null);
  });

  QUnit.test( 'textureConstantTest (gpu)', function() {
    textureConstantTest('gpu');
  });

  (GPU.isWebGlSupported() ? QUnit.test : QUnit.skip)('textureConstantTest (webgl)', function () {
    textureConstantTest('webgl');
  });

  (GPU.isWebGl2Supported() ? QUnit.test : QUnit.skip)('textureConstantTest (webgl2)', function () {
    textureConstantTest('webgl2');
  });

  (GPU.isHeadlessGlSupported() ? QUnit.test : QUnit.skip)('textureConstantTest (headlessgl)', function () {
    textureConstantTest('headlessgl');
  });

  QUnit.test( 'textureConstantTest (cpu)', function() {
    textureConstantTest('cpu');
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
    texture2DConstantTest(null);
  });

  QUnit.test( 'texture2DConstantTest (gpu)', function() {
    texture2DConstantTest('gpu');
  });

  (GPU.isWebGlSupported() ? QUnit.test : QUnit.skip)('texture2DConstantTest (webgl)', function () {
    texture2DConstantTest('webgl');
  });

  (GPU.isWebGl2Supported() ? QUnit.test : QUnit.skip)('texture2DConstantTest (webgl2)', function () {
    texture2DConstantTest('webgl2');
  });

  (GPU.isHeadlessGlSupported() ? QUnit.test : QUnit.skip)('texture2DConstantTest (headlessgl)', function () {
    texture2DConstantTest('headlessgl');
  });

  QUnit.test( 'texture2DConstantTest (cpu)', function() {
    texture2DConstantTest('cpu');
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
    texture3DConstantTest(null);
  });

  QUnit.test( 'texture3DConstantTest (gpu)', function() {
    texture3DConstantTest('cpu');
  });

  (GPU.isWebGlSupported() ? QUnit.test : QUnit.skip)('texture3DConstantTest (webgl)', function () {
    texture3DConstantTest('webgl');
  });

  (GPU.isWebGl2Supported() ? QUnit.test : QUnit.skip)('texture3DConstantTest (webgl2)', function () {
    texture3DConstantTest('webgl2');
  });

  (GPU.isHeadlessGlSupported() ? QUnit.test : QUnit.skip)('texture3DConstantTest (headlessgl)', function () {
    texture3DConstantTest('headlessgl');
  });

  QUnit.test( 'texture3DConstantTest (cpu)', function() {
    texture3DConstantTest('cpu');
  });
})();
