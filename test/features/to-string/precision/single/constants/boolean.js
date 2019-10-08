const { assert, skip, test, module: describe, only } = require('qunit');
const { GPU } = require('../../../../../../src');

describe('feature: to-string single precision constants Boolean');

function testConstant(mode, context, canvas) {
  const gpu = new GPU({ mode });
  const originalKernel1 = gpu.createKernel(function() {
    return this.constants.a ? 42 : -42;
  }, {
    canvas,
    context,
    output: [1],
    precision: 'single',
    constants: {
      a: true
    }
  });
  const originalKernel2 = gpu.createKernel(function() {
    return this.constants.a ? 42 : -42;
  }, {
    canvas,
    context,
    output: [1],
    precision: 'single',
    constants: {
      a: false
    }
  });
  assert.deepEqual(originalKernel1()[0], 42);
  assert.deepEqual(originalKernel2()[0], -42);
  const kernelString1 = originalKernel1.toString();
  const kernelString2 = originalKernel2.toString();
  const Kernel1 = new Function('return ' + kernelString1)();
  const Kernel2 = new Function('return ' + kernelString2)();
  const newKernel1 = Kernel1({ context, constants: { a: true } });
  const newKernel2 = Kernel1({ context, constants: { a: false } });
  const newKernel3 = Kernel2({ context, constants: { a: false } });
  const newKernel4 = Kernel2({ context, constants: { a: true } });

  // Boolean is "sticky" as a constant, and cannot reset
  assert.deepEqual(newKernel1()[0], 42);
  assert.deepEqual(newKernel2()[0], 42);
  assert.deepEqual(newKernel3()[0], -42);
  assert.deepEqual(newKernel4()[0], -42);
  gpu.destroy();
}

(GPU.isSinglePrecisionSupported && GPU.isWebGLSupported ? test : skip)('webgl', () => {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('webgl');
  testConstant('webgl', context, canvas);
});

(GPU.isSinglePrecisionSupported && GPU.isWebGL2Supported ? test : skip)('webgl2', () => {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('webgl2');
  testConstant('webgl2', context, canvas);
});

(GPU.isSinglePrecisionSupported && GPU.isHeadlessGLSupported ? test : skip)('headlessgl', () => {
  testConstant('headlessgl', require('gl')(1, 1), null);
});

test('cpu', () => {
  testConstant('cpu');
});
