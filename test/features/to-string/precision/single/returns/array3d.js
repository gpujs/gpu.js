const { assert, skip, test, module: describe, only } = require('qunit');
const { GPU } = require('../../../../../../src');

describe('feature: to-string single precision returns Array3d');

function testReturn(mode, context, canvas) {
  const gpu = new GPU({ mode });
  const originalKernel = gpu.createKernel(function(a, b, c) {
    return a[this.thread.x] + b[this.thread.y] + c[this.thread.z];
  }, {
    canvas,
    context,
    output: [2, 2, 2],
    precision: 'single',
  });

  const a = [1, 2];
  const b = [3, 4];
  const c = [5, 6];
  const expected = [
    [
      new Float32Array([9,10]),
      new Float32Array([10,11]),
    ],[
      new Float32Array([10,11]),
      new Float32Array([11,12]),
    ]
  ];
  const originalResult = originalKernel(a, b, c);
  assert.deepEqual(originalResult, expected);
  const kernelString = originalKernel.toString(a, b, c);
  const newResult = new Function('return ' + kernelString)()({ context })(a, b, c);
  assert.deepEqual(newResult, expected);
  gpu.destroy();
}

(GPU.isSinglePrecisionSupported && GPU.isWebGLSupported ? test : skip)('webgl', () => {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('webgl');
  testReturn('webgl', context, canvas);
});

(GPU.isSinglePrecisionSupported && GPU.isWebGL2Supported ? test : skip)('webgl2', () => {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('webgl2');
  testReturn('webgl2', context, canvas);
});

(GPU.isSinglePrecisionSupported && GPU.isHeadlessGLSupported ? test : skip)('headlessgl', () => {
  testReturn('headlessgl', require('gl')(1, 1), null);
});

test('cpu', () => {
  testReturn('cpu');
});
