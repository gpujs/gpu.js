(() => {
  const GPU = require('../../src/index');
  function sumABTest(gpu, reSetup) {
    var originalKernel = gpu.createKernel(function(a, b) {
      return a[this.thread.x] + b[this.thread.x];
    }, {
      output : [6]
    });

    QUnit.assert.ok(typeof originalKernel === 'function', 'function generated test');

    const a = [1, 2, 3, 5, 6, 7];
    const b = [4, 5, 6, 1, 2, 3];
    const expected = [5, 7, 9, 6, 8, 10];
    const originalResult = originalKernel(a,b);
    QUnit.assert.equal(originalResult.length, expected.length);
    for(let i = 0; i < expected.length; ++i) {
      QUnit.assert.equal(originalResult[i], expected[i], 'Result index: ' + i);
    }
    const kernelString = originalKernel.toString();
    const newKernel = new Function('return ' + kernelString)()();
    reSetup(newKernel, originalKernel);
    const newResult = newKernel(a,b);

    QUnit.assert.equal(newResult.length, expected.length);
    for(let i = 0; i < expected.length; ++i) {
      QUnit.assert.equal(newResult[i], expected[i], 'Result index: ' + i);
    }

    gpu.destroy();
  }

  QUnit.test('toString sumAB (auto)', function(assert) {
    sumABTest(new GPU(), function(newKernel, originalKernel) {
      var canvas = originalKernel.getCanvas();
      var context = originalKernel.getContext();
      assert.ok(canvas);
      assert.ok(context);
      newKernel
        .setContext(context)
        .setCanvas(canvas);
    });
  });

  QUnit.test('toString sumAB (gpu)', function(assert) {
    sumABTest(new GPU({ mode: 'gpu' }), function(newKernel, originalKernel) {
      var canvas = originalKernel.getCanvas();
      var context = originalKernel.getContext();
      assert.ok(canvas);
      assert.ok(context);
      newKernel
        .setContext(context)
        .setCanvas(canvas);
    });
  });

  (GPU.isWebGLSupported ? QUnit.test : QUnit.skip)('toString sumAB (webgl)', function (assert) {
    sumABTest(new GPU({mode: 'webgl'}), function (newKernel, originalKernel) {
      var canvas = originalKernel.getCanvas();
      var context = originalKernel.getContext();
      assert.ok(canvas);
      assert.ok(context);
      newKernel
        .setContext(context)
        .setCanvas(canvas);
    });
  });

  (GPU.isWebGL2Supported ? QUnit.test : QUnit.skip)('toString sumAB (webgl2)', function (assert) {
    sumABTest(new GPU({mode: 'webgl2'}), function (newKernel, originalKernel) {
      var canvas = originalKernel.getCanvas();
      var context = originalKernel.getContext();
      assert.ok(canvas);
      assert.ok(context);
      newKernel
        .setContext(context)
        .setCanvas(canvas);
    });
  });

  (GPU.isHeadlessGLSupported ? QUnit.test : QUnit.skip)('toString sumAB (headlessgl)', function (assert) {
    sumABTest(new GPU({mode: 'headlessgl'}), function (newKernel, originalKernel) {
      var canvas = originalKernel.getCanvas();
      var context = originalKernel.getContext();
      assert.ok(canvas);
      assert.ok(context);
      newKernel
        .setContext(context)
        .setCanvas(canvas);
    });
  });

  QUnit.test('toString sumAB (CPU)', function(assert) {
    sumABTest(new GPU({ mode: 'cpu' }), function(newKernel, originalKernel) {
      var canvas = originalKernel.getCanvas();
      assert.ok(canvas);
      newKernel.setCanvas(canvas);
    });
  });
})();


(() => {
  const GPU = require('../../src/index');
  function toStringTextureTest(mode) {
    var gpu = new GPU({ mode: mode });
    var a = [1, 2, 3, 5, 6, 7];
    var expected = [0.5, 1, 1.5, 2.5, 3, 3.5];
    var textureKernel = gpu.createKernel(function(a) {
      return a[this.thread.x] / 2;
    }, {
      output: [6],
      outputToTexture: true
    });
    var numberKernel = gpu.createKernel(function(a) {
      return a[this.thread.x];
    }, {
      output: [6]
    });
    const textureResult = textureKernel(a);
    QUnit.assert.equal(textureResult.constructor, GPU.Texture);
    const originalResult = numberKernel(textureResult);
    QUnit.assert.equal(originalResult.constructor, Float32Array);
    QUnit.assert.equal(originalResult.length, expected.length);
    for(var i = 0; i < expected.length; ++i) {
      QUnit.assert.equal(originalResult[i], expected[i], 'Result index: ' + i);
    }
    QUnit.assert.strictEqual(textureKernel.getCanvas(), numberKernel.getCanvas());
    QUnit.assert.strictEqual(textureKernel.getContext(), numberKernel.getContext());

    var textureKernelString = textureKernel.toString();
    var numberKernelString = numberKernel.toString();
    var newTextureKernel = new Function('return ' + textureKernelString)()();
    var newNumberKernel = new Function('return ' + numberKernelString)()();
    var canvas = textureKernel.getCanvas();
    var context = textureKernel.getContext();
    newTextureKernel
      .setTexture(GPU.Texture)
      .setContext(context)
      .setCanvas(canvas);
    newNumberKernel
      .setTexture(GPU.Texture)
      .setContext(context)
      .setCanvas(canvas);

    var newKernelResult = newTextureKernel(a);
    QUnit.assert.equal(textureResult.constructor, GPU.Texture);
    var newResult = newNumberKernel(newKernelResult);
    QUnit.assert.equal(newResult.constructor, Float32Array);
    QUnit.assert.equal(newResult.length, expected.length);
    for(i = 0; i < expected.length; ++i) {
      QUnit.assert.equal(newResult[i], expected[i], 'Result index: ' + i);
    }

    gpu.destroy();
  }

  QUnit.test('toString Texture (auto)', function() {
    toStringTextureTest();
  });

  QUnit.test('toString Texture (gpu)', function() {
    toStringTextureTest('gpu');
  });

  (GPU.isWebGLSupported ? QUnit.test : QUnit.skip)('toString Texture (webgl)', function () {
    toStringTextureTest('webgl');
  });

  (GPU.isWebGLSupported ? QUnit.test : QUnit.skip)('toString Texture (webgl2)', function () {
    toStringTextureTest('webgl2');
  });

  (GPU.isHeadlessGLSupported ? QUnit.test : QUnit.skip)('toString Texture (headlessgl)', function () {
    toStringTextureTest('headlessgl');
  });
})();

(() => {
  const GPU = require('../../src/index');
  function toStringInputTest(mode) {
    var gpu = new GPU({ mode: mode });
    var a = [
      1, 2, 3, 5, 6, 7,
      8, 9,10,11,12,13,
      14,15,16,17,18,19,
      20,21,22,23,24,25,
      26,27,28,29,30,31,
      32,33,34,35,36,37
    ];
    var expected = [24, 63, 99, 135, 171, 207];
    var originalKernel = gpu.createKernel(function(a) {
      var sum = 0;
      for (var i = 0; i < 6; i++) {
        sum += a[this.thread.x][i];
      }
      return sum;
    }, {
      output: [6]
    });
    const originalResult = originalKernel(GPU.input(a, [6, 6]));
    QUnit.assert.equal(originalResult.length, expected.length);
    for(let i = 0; i < expected.length; ++i) {
      QUnit.assert.equal(originalResult[i], expected[i], 0.1, 'Result index: ' + i);
    }

    var kernelString = originalKernel.toString();
    var newKernel = new Function('return ' + kernelString)()();
    var canvas = originalKernel.getCanvas();
    var context = originalKernel.getContext();
    newKernel
      .setInput(GPU.Input)
      .setContext(context)
      .setCanvas(canvas);

    var newResult = newKernel(GPU.input(a, [6, 6]));
    QUnit.assert.equal(newResult.constructor, Float32Array);
    QUnit.assert.equal(newResult.length, expected.length);
    for(let i = 0; i < expected.length; ++i) {
      QUnit.assert.equal(newResult[i], expected[i], 0.1, 'Result index: ' + i);
    }

    gpu.destroy();
  }

  QUnit.test('toString Input (auto)', function() {
    toStringInputTest();
  });

  QUnit.test('toString Input (gpu)', function() {
    toStringInputTest('gpu');
  });

  (GPU.isWebGLSupported ? QUnit.test : QUnit.skip)('toString Input (webgl)', function () {
    toStringInputTest('webgl');
  });

  (GPU.isWebGL2Supported ? QUnit.test : QUnit.skip)('toString Input (webgl2)', function () {
    toStringInputTest('webgl2');
  });

  (GPU.isHeadlessGLSupported ? QUnit.test : QUnit.skip)('toString Input (headlessgl)', function () {
    toStringInputTest('headlessgl');
  });

  QUnit.test('toString Input (CPU)', function() {
    toStringInputTest('cpu');
  });
})();
