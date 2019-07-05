const { assert, skip, test, module: describe, only } = require('qunit');
const { GPU } = require('../../../../../../src');

describe('feature: to-string unsigned precision arguments HTMLImage');

function testArgument(mode, done) {
  const image = new Image();
  image.src = 'jellyfish.jpeg';
  image.onload = () => {
    const gpu = new GPU({mode});
    const originalKernel = gpu.createKernel(function (a) {
      const pixel = a[0][0];
      return pixel.g * 255;
    }, {
      output: [1],
      precision: 'unsigned',
      argumentTypes: ['HTMLImage'],
    });
    const canvas = originalKernel.canvas;
    const context = originalKernel.context;
    assert.deepEqual(originalKernel(image)[0], 84);
    const kernelString = originalKernel.toString(image);
    const newKernel = new Function('return ' + kernelString)()({context, canvas});
    assert.deepEqual(newKernel(image)[0], 84);
    gpu.destroy();
    done();
  }
}

(GPU.isWebGLSupported ? test : skip)('webgl', t => {
  testArgument('webgl', t.async());
});

(GPU.isWebGL2Supported ? test : skip)('webgl2', t => {
  testArgument('webgl2', t.async());
});


