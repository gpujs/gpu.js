const { assert, skip, test, module: describe, only } = require('qunit');
const { GPU } = require('../../../../../../src');

describe('feature: to-string single precision arguments Array2D(3)');

function testArgument(mode, context, canvas) {
  const gpu = new GPU({ mode });
  const originalKernel = gpu.createKernel(function(a) {
    const array3 = a[this.thread.y][this.thread.x];
    return [array3[0] + 1, array3[1] + 1, array3[2] + 1];
  }, {
    canvas,
    context,
    output: [2,2],
    precision: 'single',
    dynamicOutput: true,
    argumentTypes: {
      a: 'Array2D(3)'
    }
  });

  const a = [
    [
      [1, 2, 3],
      [4, 5, 6],
    ],
    [
      [7, 8, 9],
      [10, 11, 12],
    ]
  ];
  const expected = [
    [
      new Float32Array([2, 3, 4]),
      new Float32Array([5, 6, 7]),
    ],
    [
      new Float32Array([8, 9, 10]),
      new Float32Array([11, 12, 13]),
    ]
  ];
  const originalResult = originalKernel(a);
  assert.deepEqual(originalResult, expected);
  const kernelString = originalKernel.toString(a);
  const newResult = new Function('return ' + kernelString)()({ context })(a);
  assert.deepEqual(newResult, expected);
  gpu.destroy();
}

(GPU.isSinglePrecisionSupported && GPU.isWebGLSupported ? test : skip)('webgl', () => {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('webgl');
  testArgument('webgl', context, canvas);
});

(GPU.isSinglePrecisionSupported && GPU.isWebGL2Supported ? test : skip)('webgl2', () => {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('webgl2');
  testArgument('webgl2', context, canvas);
});

(GPU.isSinglePrecisionSupported && GPU.isHeadlessGLSupported ? test : skip)('headlessgl', () => {
  testArgument('headlessgl', require('gl')(1, 1), null);
});

test('cpu', () => {
  testArgument('cpu');
});
