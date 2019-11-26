const { assert, skip, test, module: describe, only } = require('qunit');
const { GPU } = require('../../../../../../src');

describe('feature: to-string single precision returns Texture');

function testReturn(mode, context, canvas) {
  const gpu = new GPU({ mode });
  const originalKernel = gpu.createKernel(function(a) {
    return a[this.thread.x] + 1;
  }, {
    canvas,
    context,
    output: [6],
    precision: 'single',
    pipeline: true,
  });

  const a = [1, 2, 3, 4, 5, 6];
  const expected = new Float32Array([2, 3, 4, 5, 6, 7]);
  const originalResult = originalKernel(a);
  assert.equal(originalResult.constructor.name, 'GLTextureFloat');
  const kernelString = originalKernel.toString(a);
  const newResult = new Function('return ' + kernelString)()({ context })(a);
  assert.deepEqual(newResult.toArray(), expected);
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
