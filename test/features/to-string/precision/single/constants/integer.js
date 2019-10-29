const { assert, skip, test, module: describe, only } = require('qunit');
const { GPU } = require('../../../../../../dist/gpu.js');

describe('feature: to-string single precision constants Integer');

function testConstant(mode, context, canvas) {
  const gpu = new GPU({ mode });
  const originalKernel = gpu.createKernel(function() {
    return Math.floor(this.constants.a) === 100 ? 42 : -42;
  }, {
    canvas,
    context,
    output: [1],
    precision: 'single',
    constants: {
      a: 100
    },
    constantTypes: { a: 'Integer' }
  });
  assert.equal(originalKernel.constantTypes.a, 'Integer');
  assert.deepEqual(originalKernel()[0], 42);
  const kernelString = originalKernel.toString();
  const Kernel = new Function('return ' + kernelString)();
  const newKernel = Kernel({ context, constants: { a: 100 } });
  assert.deepEqual(newKernel()[0], 42);

  // Integer is "sticky" as a constant, and cannot reset
  const newKernel2 = Kernel({ context, constants: { a: 200 } });
  assert.deepEqual(newKernel2()[0], 42);
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
