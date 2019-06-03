const { assert, skip, test, module: describe, only } = require('qunit');
const { GPU } = require('../../../../../../src');

describe('feature: to-string unsigned precision arguments Boolean');

function testArgument(mode, context, canvas) {
  const gpu = new GPU({ mode });
  const originalKernel = gpu.createKernel(function(a) {
    return a ? 42 : -42;
  }, {
    canvas,
    context,
    output: [1],
    precision: 'unsigned',
  });
  assert.deepEqual(originalKernel(true)[0], 42);
  assert.deepEqual(originalKernel(false)[0], -42);
  const kernelString = originalKernel.toString(true);
  const newKernel = new Function('return ' + kernelString)()({ context });
  assert.deepEqual(newKernel(true)[0], 42);
  assert.deepEqual(newKernel(false)[0], -42);
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
