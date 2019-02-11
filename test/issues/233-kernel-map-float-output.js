const { assert, skip, test, module: describe, only } = require('qunit');
const { GPU } = require('../../src');

describe('issue # 233');

function kernelMapFloatOutput(mode) {
  const lst = [1, 2, 3, 4, 5, 6, 7];
  const gpu = new GPU({ mode });
  const kernels = gpu.createKernelMap({
    stepA: function (x) {
      return x * x;
    },
    stepB: function (x) {
      return x + 1;
    }
  }, function (lst) {
    const val = lst[this.thread.x];

    stepA(val);
    stepB(val);

    return val;
  }, {
    floatOutput: true,
    output: [lst.length]
  });

  const result = kernels(lst);
  const unwrap = gpu.createKernel(function(x) {
    return x[this.thread.x];
  }, { output: [lst.length], floatTextures: true });

  const stepAResult = unwrap(result.stepA);
  const stepBResult = unwrap(result.stepB);

  assert.deepEqual(Array.from(stepAResult), lst.map(function (x) { return x * x }));
  assert.deepEqual(Array.from(stepBResult), lst.map(function (x) { return x + 1 }));
  assert.deepEqual(Array.from(result.result), lst);
  gpu.destroy();
}

(GPU.isFloatOutputSupported && GPU.isKernelMapSupported ? test : skip)('Issue #233 - kernel map with float output auto', () => {
  kernelMapFloatOutput();
});

(GPU.isFloatOutputSupported && GPU.isKernelMapSupported ? test : skip)('Issue #233 - kernel map with float output gpu', () => {
  kernelMapFloatOutput('gpu');
});

(GPU.isFloatOutputSupported && GPU.isWebGLSupported ? test : skip)('Issue #233 - kernel map with float output webgl', () => {
  kernelMapFloatOutput('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('Issue #233 - kernel map with float output webgl2', () => {
  kernelMapFloatOutput('webgl2');
});

(GPU.isHeadlessGLSupported && GPU.isKernelMapSupported ? test : skip)('Issue #233 - kernel map with float output headlessgl', () => {
  kernelMapFloatOutput('headlessgl');
});

test('Issue #233 - kernel map with float output cpu', () => {
  kernelMapFloatOutput('cpu');
});
