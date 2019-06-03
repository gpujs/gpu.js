const { assert, skip, test, module: describe, only } = require('qunit');
const { GPU, input } = require('../../../../../../src');

describe('feature: to-string unsigned precision arguments Input');

function testArgument(mode, context, canvas) {
  const gpu = new GPU({ mode });
  const originalKernel = gpu.createKernel(function(a) {
    let sum = 0;
    for (let y = 0; y < 2; y++) {
      for (let x = 0; x < 2; x++) {
        sum += a[y][x];
      }
    }
    return sum;
  }, {
    canvas,
    context,
    output: [1],
    precision: 'unsigned',
  });
  const arg1 = input([1,2,3,4],[2,2]);
  const arg2 = input([5,6,7,8],[2,2]);
  assert.deepEqual(originalKernel(arg1)[0], 10);
  assert.deepEqual(originalKernel(arg2)[0], 26);
  const kernelString = originalKernel.toString(arg1);
  const newKernel = new Function('return ' + kernelString)()({ context });
  assert.deepEqual(newKernel(arg1)[0], 10);
  assert.deepEqual(newKernel(arg2)[0], 26);
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
