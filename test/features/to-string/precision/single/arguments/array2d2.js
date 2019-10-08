const { assert, skip, test, module: describe, only } = require('qunit');
const { GPU } = require('../../../../../../src');

describe('feature: to-string single precision arguments Array2D(2)');

function testArgument(mode, context, canvas) {
  const gpu = new GPU({ mode });
  const originalKernel = gpu.createKernel(function(a) {
    const array2 = a[this.thread.y][this.thread.x];
    return [array2[0] + 1, array2[1] + 1];
  }, {
    canvas,
    context,
    output: [2,2],
    precision: 'single',
    argumentTypes: {
      a: 'Array2D(2)'
    }
  });

  const a = [
    [
      [1, 2],
      [3, 4],
    ],
    [
      [5, 6],
      [7, 8],
    ]
  ];
  const expected = [
    [
      new Float32Array([2, 3]),
      new Float32Array([4, 5]),
    ],
    [
      new Float32Array([6, 7]),
      new Float32Array([8, 9]),
    ]
  ];
  const originalResult = originalKernel(a);
  assert.deepEqual(originalResult, expected);
  const kernelString = originalKernel.toString(a);
  const newKernel = new Function('return ' + kernelString)()({ context })
  const newResult = newKernel(a);
  assert.deepEqual(newResult, expected);

  const b = [
    [
      [1, 1],
      [1, 1],
    ],
    [
      [1, 1],
      [1, 1],
    ]
  ];
  const expected2 = [
    [
      new Float32Array([2, 2]),
      new Float32Array([2, 2]),
    ],
    [
      new Float32Array([2, 2]),
      new Float32Array([2, 2]),
    ]
  ];
  const newResult2 = newKernel(b);
  assert.deepEqual(newResult2, expected2);
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
