(function() {
  const GPU = require('../../src/index');
  function test(mode) {
    var gpu = new GPU({ mode: mode });

    var kernel = gpu.createKernel(function(kernelArg1, kernelArg2) {
      function someFun1(someFun1Arg1, someFun1Arg2) {
        return customAdder(someFun1Arg1, someFun1Arg2);
      }
      function someFun2(someFun2Arg1, someFun2Arg2) {
        return customAdder(someFun2Arg1, someFun2Arg2);
      }
      function customAdder(customAdderArg1, customAdderArg2) {
        return customAdderArg1 + customAdderArg2;
      }
      return someFun1(1,2) + someFun2(kernelArg1[this.thread.x], kernelArg2[this.thread.x]);
    })
      .setOutput([6]);

    const a = [1, 2, 3, 5, 6, 7];
    const b = [4, 5, 6, 1, 2, 3];
    const result = kernel(a,b);
    QUnit.assert.deepEqual(Array.from(result), [8,10,12,9,11,13]);
    gpu.destroy();
  }

  QUnit.test('Issue #207 - same function reuse (auto)', () => {
    test(null);
  });

  QUnit.test('Issue #207 - same function reuse (gpu)', () => {
    test('gpu');
  });

  (GPU.isWebGLSupported ? QUnit.test : QUnit.skip)('Issue #207 - same function reuse (webgl)', () => {
    test('webgl');
  });

  (GPU.isWebGL2Supported ? QUnit.test : QUnit.skip)('Issue #207 - same function reuse (webgl2)', () => {
    test('webgl2');
  });

  (GPU.isHeadlessGLSupported ? QUnit.test : QUnit.skip)('Issue #207 - same function reuse (headlessgl)', () => {
    test('headlessgl');
  });

  QUnit.test('Issue #207 - same function reuse (cpu)', () => {
    test('cpu');
  });
})();
