(() => {
  const GPU = require('../../src/index');
  function sumABTest(mode, canvas, context) {
    const gpu = new GPU({ mode, canvas, context });
    const originalKernel = gpu.createKernel(function(a, b) {
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
    newKernel
      .setContext(originalKernel.getContext())
      .setCanvas(originalKernel.getCanvas());
    const newResult = newKernel(a,b);

    QUnit.assert.equal(newResult.length, expected.length);
    for(let i = 0; i < expected.length; ++i) {
      QUnit.assert.equal(newResult[i], expected[i], 'Result index: ' + i);
    }

    gpu.destroy();
  }

  QUnit.test('toString sumAB (auto)', () => {
    if (GPU.isHeadlessGLSupported) {
      sumABTest(null, {}, require('gl')(1, 1));
    } else {
      sumABTest(null);
    }
  });

  QUnit.test('toString sumAB (gpu)', () => {
    if (GPU.isHeadlessGLSupported) {
      sumABTest('gpu', {}, require('gl')(1, 1));
    } else {
      sumABTest('gpu');
    }
  });

  (GPU.isWebGLSupported ? QUnit.test : QUnit.skip)('toString sumAB (webgl)', () => {
    sumABTest('webgl');
  });

  (GPU.isWebGL2Supported ? QUnit.test : QUnit.skip)('toString sumAB (webgl2)', () => {
    sumABTest('webgl2');
  });

  (GPU.isHeadlessGLSupported ? QUnit.test : QUnit.skip)('toString sumAB (headlessgl)', () => {
    sumABTest('headlessgl', {}, require('gl')(1, 1));
  });

  QUnit.test('toString sumAB (CPU)', () => {
    sumABTest('cpu');
  });
})();


(() => {
  const GPU = require('../../src/index');
  function toStringTextureTest(mode) {
    const gpu = new GPU({ mode: mode });
    const a = [1, 2, 3, 5, 6, 7];
    const expected = [0.5, 1, 1.5, 2.5, 3, 3.5];
    const textureKernel = gpu.createKernel(function(a) {
      return a[this.thread.x] / 2;
    }, {
      output: [6],
      outputToTexture: true
    });
    const numberKernel = gpu.createKernel(function(a) {
      return a[this.thread.x];
    }, {
      output: [6]
    });
    const textureResult = textureKernel(a);
    QUnit.assert.equal(textureResult.constructor, GPU.Texture);
    const originalResult = numberKernel(textureResult);
    QUnit.assert.equal(originalResult.constructor, Float32Array);
    QUnit.assert.equal(originalResult.length, expected.length);
    for(let i = 0; i < expected.length; ++i) {
      QUnit.assert.equal(originalResult[i], expected[i], 'Result index: ' + i);
    }
    QUnit.assert.strictEqual(textureKernel.getCanvas(), numberKernel.getCanvas());
    QUnit.assert.strictEqual(textureKernel.getContext(), numberKernel.getContext());

    const textureKernelString = textureKernel.toString();
    const numberKernelString = numberKernel.toString();
    const newTextureKernel = new Function('return ' + textureKernelString)()();
    const newNumberKernel = new Function('return ' + numberKernelString)()();
    const canvas = textureKernel.getCanvas();
    const context = textureKernel.getContext();
    newTextureKernel
      .setTexture(GPU.Texture)
      .setContext(context)
      .setCanvas(canvas);
    newNumberKernel
      .setTexture(GPU.Texture)
      .setContext(context)
      .setCanvas(canvas);

    const newKernelResult = newTextureKernel(a);
    QUnit.assert.equal(textureResult.constructor, GPU.Texture);
    const newResult = newNumberKernel(newKernelResult);
    QUnit.assert.equal(newResult.constructor, Float32Array);
    QUnit.assert.equal(newResult.length, expected.length);
    for(let i = 0; i < expected.length; ++i) {
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
    const gpu = new GPU({ mode: mode });
    const a = [
      1, 2, 3, 5, 6, 7,
      8, 9,10,11,12,13,
      14,15,16,17,18,19,
      20,21,22,23,24,25,
      26,27,28,29,30,31,
      32,33,34,35,36,37
    ];
    const expected = [24, 63, 99, 135, 171, 207];
    const originalKernel = gpu.createKernel(function(a) {
      let sum = 0;
      for (let i = 0; i < 6; i++) {
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

    const kernelString = originalKernel.toString();
    const newKernel = new Function('return ' + kernelString)()();
    const canvas = originalKernel.getCanvas();
    const context = originalKernel.getContext();
    newKernel
      .setInput(GPU.Input)
      .setContext(context)
      .setCanvas(canvas);

    const newResult = newKernel(GPU.input(a, [6, 6]));
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
