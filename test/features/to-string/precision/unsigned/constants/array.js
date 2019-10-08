const { assert, skip, test, module: describe, only } = require('qunit');
const { GPU } = require('../../../../../../src');

describe('feature: to-string unsigned precision constants Array');

function testConstant(mode, context, canvas) {
  const gpu = new GPU({ mode });
  const originalKernel = gpu.createKernel(function() {
    return this.constants.a[this.thread.x];
  }, {
    canvas,
    context,
    output: [4],
    precision: 'unsigned',
    constants: {
      a: [1, 2, 3, 4]
    }
  });
  const expected = new Float32Array([1,2,3,4]);
  const originalResult = originalKernel();
  assert.deepEqual(originalResult, expected);
  const kernelString = originalKernel.toString();
  const newResult = new Function('return ' + kernelString)()({ context, constants: { a: [1, 2, 3, 4] } })();
  assert.deepEqual(newResult, expected);

  const expected2 = new Float32Array([4,3,2,1]);
  const newResult2 = new Function('return ' + kernelString)()({ context, constants: { a: [4, 3, 2, 1] } })();
  assert.deepEqual(newResult2, expected2);
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
