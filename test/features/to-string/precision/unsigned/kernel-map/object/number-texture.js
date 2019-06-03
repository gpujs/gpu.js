const { assert, skip, test, module: describe, only } = require('qunit');
const { GPU } = require('../../../../../../../src');

describe('feature: to-string unsigned precision object style kernel map returns NumberTexture');

function testReturn(mode, context, canvas) {
  const gpu = new GPU({ mode });
  function addOne(value) {
    return value + 1;
  }
  const originalKernel = gpu.createKernelMap({ addOneResult: addOne }, function(a) {
    const result = a[this.thread.x] + 1;
    addOne(result);
    return result;
  }, {
    canvas,
    context,
    output: [6],
    precision: 'unsigned',
    pipeline: true,
  });

  const a = [1, 2, 3, 4, 5, 6];
  const expected = new Float32Array([2, 3, 4, 5, 6, 7]);
  const expectedZero = new Float32Array([3, 4, 5, 6, 7, 8]);
  const originalResult = originalKernel(a);
  assert.deepEqual(originalResult.result.toArray(), expected);
  assert.deepEqual(originalResult.addOneResult.toArray(), expectedZero);
  const kernelString = originalKernel.toString(a);
  const newResult = new Function('return ' + kernelString)()({ context })(a);
  assert.deepEqual(newResult.result.toArray(), expected);
  assert.deepEqual(newResult.addOneResult.toArray(), expectedZero);
  gpu.destroy();
}

(GPU.isWebGLSupported ? test : skip)('webgl', () => {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('webgl');
  testReturn('webgl', context, canvas);
});

(GPU.isWebGL2Supported ? test : skip)('webgl2', () => {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('webgl2');
  testReturn('webgl2', context, canvas);
});

(GPU.isHeadlessGLSupported ? test : skip)('headlessgl', () => {
  testReturn('headlessgl', require('gl')(1, 1), null);
});
