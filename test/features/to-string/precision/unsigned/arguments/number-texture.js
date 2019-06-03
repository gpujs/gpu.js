const { assert, skip, test, module: describe, only } = require('qunit');
const { GPU } = require('../../../../../../src');

describe('feature: to-string unsigned precision arguments NumberTexture');

function testArgument(mode, context, canvas) {
  const gpu = new GPU({ mode, context, canvas });
  const texture1 = gpu.createKernel(function() {
    return this.thread.x;
  }, {
    output: [4],
    optimizeFloatMemory: false,
    precision: 'unsigned',
    pipeline: true,
  })();
  const texture2 = gpu.createKernel(function() {
    return 4 - this.thread.x;
  }, {
    output: [4],
    optimizeFloatMemory: false,
    precision: 'unsigned',
    pipeline: true,
  })();
  const originalKernel = gpu.createKernel(function(a) {
    return a[this.thread.x];
  }, {
    canvas,
    context,
    output: [4],
    precision: 'unsigned'
  });
  assert.deepEqual(originalKernel(texture1), new Float32Array([0,1,2,3]));
  assert.deepEqual(originalKernel(texture2), new Float32Array([4,3,2,1]));

  const kernelString = originalKernel.toString(texture1);
  const newKernel = new Function('return ' + kernelString)()({ context });
  assert.deepEqual(newKernel(texture1), new Float32Array([0,1,2,3]));
  assert.deepEqual(newKernel(texture2), new Float32Array([4,3,2,1]));
  gpu.destroy();
}

(GPU.isWebGLSupported ? test : skip)('webgl', () => {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('webgl');
  testArgument('webgl', context, canvas);
});

(GPU.isWebGL2Supported ? test : skip)('webgl2', () => {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('webgl2');
  testArgument('webgl2', context, canvas);
});

(GPU.isHeadlessGLSupported ? test : skip)('headlessgl', () => {
  testArgument('headlessgl', require('gl')(1, 1), null);
});

test('cpu', () => {
  testArgument('cpu');
});
