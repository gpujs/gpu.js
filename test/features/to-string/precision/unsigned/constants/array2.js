const { assert, skip, test, module: describe, only } = require('qunit');
const { GPU } = require('../../../../../../dist/gpu.js');

describe('feature: to-string unsigned precision constants Array(2)');

function testConstant(mode, context, canvas) {
  const gpu = new GPU({ mode });
  const originalKernel = gpu.createKernel(function() {
    return this.constants.a;
  }, {
    canvas,
    context,
    output: [1],
    precision: 'unsigned',
    constants: {
      a: new Float32Array([1, 2])
    },
    constantTypes: {
      a: 'Array(2)'
    }
  });
  const expected = [new Float32Array([1, 2])];
  const originalResult = originalKernel();
  assert.deepEqual(originalResult, expected);
  const kernelString = originalKernel.toString();
  const Kernel = new Function('return ' + kernelString)();
  const newResult = Kernel({ context, constants: { a: new Float32Array([1, 2]) } })();
  assert.deepEqual(newResult, expected);

  // Array(2) is "sticky" as a constant, and cannot reset
  const newResult2 = Kernel({ context, constants: { a: new Float32Array([2, 1]) } })();
  assert.deepEqual(newResult2, expected);
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
