const { assert, skip, test, module: describe, only } = require('qunit');
const { GPU } = require('../../../../../../src');

describe('feature: to-string unsigned precision arguments Float');

function testArgument(mode, context, canvas) {
  const gpu = new GPU({ mode });
  const originalKernel = gpu.createKernel(function(a) {
    return Math.floor(a) === 100 ? 42 : -42;
  }, {
    canvas,
    context,
    output: [1],
    precision: 'unsigned',
    argumentTypes: { a: 'Float' },
  });
  assert.equal(originalKernel.argumentTypes[0], 'Float');
  assert.deepEqual(originalKernel(100)[0], 42);
  assert.deepEqual(originalKernel(10)[0], -42);
  const kernelString = originalKernel.toString(100);
  const newKernel = new Function('return ' + kernelString)()({ context });
  assert.deepEqual(newKernel(100)[0], 42);
  assert.deepEqual(newKernel(10)[0], -42);
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
