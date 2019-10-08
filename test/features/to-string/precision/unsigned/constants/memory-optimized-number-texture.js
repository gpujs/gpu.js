const { assert, skip, test, module: describe, only } = require('qunit');
const { GPU } = require('../../../../../../src');

describe('feature: to-string unsigned precision constants MemoryOptimizedNumberTexture');

function testConstant(mode, context, canvas) {
  const gpu = new GPU({ mode, context, canvas });
  const texture = gpu.createKernel(function() {
    return this.thread.x;
  }, {
    output: [4],
    optimizeFloatMemory: true,
    precision: 'unsigned',
    pipeline: true,
  })();
  const texture2 = gpu.createKernel(function() {
    return this.output.x - this.thread.x;
  }, {
    output: [4],
    optimizeFloatMemory: true,
    precision: 'unsigned',
    pipeline: true,
  })();
  const originalKernel = gpu.createKernel(function() {
    return this.constants.a[this.thread.x];
  }, {
    output: [4],
    precision: 'unsigned',
    constants: {
      a: texture
    }
  });
  assert.deepEqual(originalKernel(), new Float32Array([0,1,2,3]));
  const kernelString = originalKernel.toString();
  const Kernel = new Function('return ' + kernelString)();
  const newKernel = Kernel({ context, constants: { a: texture } });
  const newKernel2 = Kernel({ context, constants: { a: texture2 } });
  assert.deepEqual(texture2.toArray ? texture2.toArray() : texture2, new Float32Array([4,3,2,1]));
  assert.deepEqual(texture.toArray ? texture.toArray() : texture, new Float32Array([0,1,2,3]));
  assert.deepEqual(newKernel(), new Float32Array([0,1,2,3]));
  assert.deepEqual(newKernel2(), new Float32Array([4,3,2,1]));
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
