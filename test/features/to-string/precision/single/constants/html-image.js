const { assert, skip, test, module: describe, only } = require('qunit');
const { GPU } = require('../../../../../../src');

describe('feature: to-string single precision constants HTMLImage');

function testArgument(mode, done) {
  loadImages(['jellyfish-1.jpeg', 'jellyfish-2.jpeg'])
    .then(([image1, image2]) => {
      const gpu = new GPU({mode});
      const originalKernel = gpu.createKernel(function () {
        const pixel = this.constants.a[0][0];
        return pixel.b * 255;
      }, {
        output: [1],
        precision: 'single',
        constants: { a: image1 }
      });
      const canvas = originalKernel.canvas;
      const context = originalKernel.context;
      assert.deepEqual(originalKernel()[0], 253);
      const kernelString = originalKernel.toString();
      const newKernel = new Function('return ' + kernelString)()({context, canvas, constants: { a: image2 } });
      assert.deepEqual(newKernel(image2)[0], 255);
      gpu.destroy();
      done();
    });
}

(GPU.isSinglePrecisionSupported && GPU.isWebGLSupported ? test : skip)('webgl', t => {
  testArgument('webgl', t.async());
});

(GPU.isSinglePrecisionSupported && GPU.isWebGL2Supported ? test : skip)('webgl2', t => {
  testArgument('webgl2', t.async());
});

(GPU.isSinglePrecisionSupported && (GPU.isWebGLSupported || GPU.isWebGL2Supported) ? test : skip)('cpu', t => {
  testArgument('cpu', t.async());
});


