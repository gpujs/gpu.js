const { assert, skip, test, module: describe, only } = require('qunit');
const { GPU } = require('../../src');

describe('issue #207');

function sameFunctionReuse(mode) {
  const gpu = new GPU({ mode });

  const kernel = gpu.createKernel(function(kernelArg1, kernelArg2) {
    function someFun1(someFun1Arg1, someFun1Arg2) {
      return customAdder(someFun1Arg1, someFun1Arg2);
    }
    function someFun2(someFun2Arg1, someFun2Arg2) {
      return customAdder(someFun2Arg1, someFun2Arg2);
    }
    function customAdder(customAdderArg1, customAdderArg2) {
      return customAdderArg1 + customAdderArg2;
    }
    return someFun1(1, 2) + someFun2(kernelArg1[this.thread.x], kernelArg2[this.thread.x]);
  })
    .setOutput([6]);

  const a = [1, 2, 3, 5, 6, 7];
  const b = [4, 5, 6, 1, 2, 3];
  const result = kernel(a,b);
  assert.deepEqual(Array.from(result), [8, 10, 12, 9, 11, 13]);
  gpu.destroy();
}

test('Issue #207 - same function reuse auto', () => {
  sameFunctionReuse(null);
});

test('Issue #207 - same function reuse gpu', () => {
  sameFunctionReuse('gpu');
});

(GPU.isWebGLSupported ? test : skip)('Issue #207 - same function reuse webgl', () => {
  sameFunctionReuse('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('Issue #207 - same function reuse webgl2', () => {
  sameFunctionReuse('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('Issue #207 - same function reuse headlessgl', () => {
  sameFunctionReuse('headlessgl');
});

test('Issue #207 - same function reuse cpu', () => {
  sameFunctionReuse('cpu');
});
