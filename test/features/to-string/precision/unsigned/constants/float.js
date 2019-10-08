const { assert, skip, test, module: describe, only } = require('qunit');
const { GPU } = require('../../../../../../src');

describe('feature: to-string unsigned precision constants Float');

function testConstant(mode, context, canvas) {
  const gpu = new GPU({ mode });
  const originalKernel = gpu.createKernel(function() {
    return Math.floor(this.constants.a) === 100 ? 42 : -42;
  }, {
    canvas,
    context,
    output: [1],
    precision: 'unsigned',
    constants: {
      a: 100
    },
    constantTypes: { a: 'Float' }
  });
  assert.equal(originalKernel.constantTypes.a, 'Float');
  assert.deepEqual(originalKernel()[0], 42);
  const kernelString = originalKernel.toString();
  const Kernel = new Function('return ' + kernelString)();

  // Float is "sticky" as a constant, and cannot reset
  const newKernel = Kernel({ context, constants: { a: 100 } });
  assert.deepEqual(newKernel()[0], 42);
  gpu.destroy();
}

(GPU.isWebGLSupported ? test : skip)('webgl', () => {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('webgl');
  testConstant('webgl', context, canvas);
});

(GPU.isWebGL2Supported ? test : skip)('webgl2', () => {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('webgl2');
  testConstant('webgl2', context, canvas);
});

(GPU.isHeadlessGLSupported ? test : skip)('headlessgl', () => {
  testConstant('headlessgl', require('gl')(1, 1), null);
});

test('cpu', () => {
  testConstant('cpu');
});
