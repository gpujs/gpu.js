const { assert, skip, test, module: describe, only } = require('qunit');
const { GPU } = require('../../../../../../src');

describe('feature: to-string single precision constants Array(4)');

function testConstant(mode, context, canvas) {
  const gpu = new GPU({ mode });
  const a = new Float32Array([1, 2, 3, 4]);
  const originalKernel = gpu.createKernel(function() {
    return this.constants.a;
  }, {
    canvas,
    context,
    output: [1],
    precision: 'single',
    constants: {
      a
    },
    constantTypes: {
      a: 'Array(4)'
    }
  });
  const expected = [new Float32Array([1, 2, 3, 4])];
  const originalResult = originalKernel();
  assert.deepEqual(originalResult, expected);
  const kernelString = originalKernel.toString();
  const newResult = new Function('return ' + kernelString)()({ context, constants: { a } })();
  assert.deepEqual(newResult, expected);

  // Array(3) is "sticky" as a constant, and cannot reset
  const b = new Float32Array([4, 3, 2, 1]);
  const expected2 = [new Float32Array([1, 2, 3, 4])];
  const newResult2 = new Function('return ' + kernelString)()({ context, constants: { a: b } })();
  assert.deepEqual(newResult2, expected2);
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
