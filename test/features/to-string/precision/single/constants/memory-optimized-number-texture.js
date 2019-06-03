const { assert, skip, test, module: describe, only } = require('qunit');
const { GPU } = require('../../../../../../src');

describe('feature: to-string single precision constants MemoryOptimizedNumberTexture');

function testConstant(mode, context, canvas) {
  const gpu = new GPU({ mode, context, canvas });
  const texture = gpu.createKernel(function() {
    return this.thread.x;
  }, {
    output: [4],
    optimizeFloatMemory: true,
    precision: 'single',
    pipeline: true,
  })();
  const originalKernel = gpu.createKernel(function() {
    return this.constants.a[this.thread.x];
  }, {
    output: [4],
    precision: 'single',
    constants: {
      a: texture
    }
  });
  assert.deepEqual(originalKernel(), new Float32Array([0,1,2,3]));
  const kernelString = originalKernel.toString();
  const newKernel = new Function('return ' + kernelString)()({ context, constants: { a: texture } });
  assert.deepEqual(newKernel(), new Float32Array([0,1,2,3]));
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
