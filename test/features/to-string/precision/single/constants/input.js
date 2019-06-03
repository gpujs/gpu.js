const { assert, skip, test, module: describe, only } = require('qunit');
const { GPU, input } = require('../../../../../../src');

describe('feature: to-string single precision constants Input');

function testConstant(mode, context, canvas) {
  const gpu = new GPU({ mode });
  const a = input([1,2,3,4],[2,2]);
  const originalKernel = gpu.createKernel(function() {
    let sum = 0;
    for (let y = 0; y < 2; y++) {
      for (let x = 0; x < 2; x++) {
        sum += this.constants.a[y][x];
      }
    }
    return sum;
  }, {
    canvas,
    context,
    output: [1],
    precision: 'single',
    constants: {
      a
    }
  });
  assert.deepEqual(originalKernel()[0], 10);
  const kernelString = originalKernel.toString();
  const newKernel = new Function('return ' + kernelString)()({ context, constants: { a } });
  assert.deepEqual(newKernel()[0], 10);
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
