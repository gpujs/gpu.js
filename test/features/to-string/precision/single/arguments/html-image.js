const { assert, skip, test, module: describe, only } = require('qunit');
const { GPU } = require('../../../../../../src');

describe('feature: to-string single precision arguments HTMLImage');

function testArgument(mode, done) {
  const image = new Image();
  image.src = 'jellyfish.jpeg';
  image.onload = () => {
    const gpu = new GPU({mode});
    const originalKernel = gpu.createKernel(function (a) {
      const pixel = a[0][0];
      return pixel.b * 255;
    }, {
      output: [1],
      precision: 'single',
      argumentTypes: ['HTMLImage'],
    });
    const canvas = originalKernel.canvas;
    const context = originalKernel.context;
    assert.deepEqual(originalKernel(image)[0], 253);
    const kernelString = originalKernel.toString(image);
    const newKernel = new Function('return ' + kernelString)()({context, canvas});
    assert.deepEqual(newKernel(image)[0], 253);
    gpu.destroy();
    done();
  }
}

(GPU.isSinglePrecisionSupported && GPU.isWebGLSupported ? test : skip)('webgl', t => {
  testArgument('webgl', t.async());
});

(GPU.isSinglePrecisionSupported && GPU.isWebGL2Supported ? test : skip)('webgl2', t => {
  testArgument('webgl2', t.async());
});


