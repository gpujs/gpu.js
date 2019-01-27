(function() {
  const GPU = require('../../src/index');
  const glslDivide = `float divide(float a, float b) {
    return a / b;
  }`;
  const jsDivide = `function divide(a, b) {
    return a / b;
  }`;

  function addCustomNativeFunctionDivide(mode, fn) {
    const gpu = new GPU({ mode: mode });

    gpu.addNativeFunction('divide', fn);

    const f = gpu.createKernel(function(a, b) {
      return divide(a[this.thread.x], b[this.thread.x]);
    }, {
      output : [6]
    });

    QUnit.assert.ok(f !== null, 'function generated test');

    const a = [1, 4, 3, 5, 6, 3];
    const b = [4, 2, 6, 1, 2, 3];

    const res = f(a,b);
    const exp = [0.25, 2, 0.5, 5, 3, 1];

    for(let i = 0; i < exp.length; ++i) {
      QUnit.assert.equal(res[i], exp[i], 'Result arr idx: '+i);
    }
    gpu.destroy();
  }

  QUnit.test('addCustomNativeFunctionDivide (auto)', () => {
    addCustomNativeFunctionDivide(null, glslDivide);
  });

  QUnit.test('addCustomNativeFunctionDivide (gpu)', () => {
    addCustomNativeFunctionDivide('gpu', glslDivide);
  });

  (GPU.isWebGLSupported ? QUnit.test : QUnit.skip)('addCustomNativeFunctionDivide (webgl)', () => {
    addCustomNativeFunctionDivide('webgl', glslDivide);
  });

  (GPU.isWebGL2Supported ? QUnit.test : QUnit.skip)('addCustomNativeFunctionDivide (webgl2)', () => {
    addCustomNativeFunctionDivide('webgl2', glslDivide);
  });

  (GPU.isHeadlessGLSupported ? QUnit.test : QUnit.skip)('addCustomNativeFunctionDivide (headlessgl)', () => {
    addCustomNativeFunctionDivide('headlessgl', glslDivide);
  });

  QUnit.test('addCustomNativeFunctionDivide (cpu)', () => {
    addCustomNativeFunctionDivide('cpu', jsDivide);
  });

  function addCustomNativeFunctionDivideFallback(mode) {
    const gpu = new GPU({ mode: mode });

    gpu.addNativeFunction('divide', `float divide(float a, float b) {
    return a / b;
  }`);

    function divide(a,b) {
      return a / b;
    }

    const f = gpu.createKernel(function(a, b) {
      return divide(a[this.thread.x], b[this.thread.x]);
    }, {
      functions: [divide],
      output : [6]
    });

    QUnit.assert.ok( f !== null, 'function generated test');

    const a = [1, 4, 3, 5, 6, 3];
    const b = [4, 2, 6, 1, 2, 3];

    const res = f(a,b);
    const exp = [0.25, 2, 0.5, 5, 3, 1];

    for(let i = 0; i < exp.length; ++i) {
      QUnit.assert.equal(res[i], exp[i], 'Result arr idx: '+i);
    }
    gpu.destroy();
  }

  QUnit.test('addCustomNativeFunctionDivideFallback (GPU only) (auto)', () => {
    addCustomNativeFunctionDivideFallback(null);
  });

  QUnit.test('addCustomNativeFunctionDivideFallback (GPU only) (gpu)', () => {
    addCustomNativeFunctionDivideFallback('gpu');
  });

  (GPU.isWebGLSupported ? QUnit.test : QUnit.skip)('addCustomNativeFunctionDivideFallback (GPU only) (webgl)', () => {
    addCustomNativeFunctionDivideFallback('webgl');
  });

  (GPU.isWebGL2Supported ? QUnit.test : QUnit.skip)('addCustomNativeFunctionDivideFallback (GPU only) (webgl2)', () => {
    addCustomNativeFunctionDivideFallback('webgl2');
  });

  (GPU.isHeadlessGLSupported ? QUnit.test : QUnit.skip)('addCustomNativeFunctionDivideFallback (GPU only) (headlessgl)', () => {
    addCustomNativeFunctionDivideFallback('headlessgl');
  });
})();
