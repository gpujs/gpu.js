const { assert, skip, test, module: describe, only } = require('qunit');
const { GPU } = require('../../../../../../src');

describe('feature: to-string unsigned precision arguments HTMLImage');

function testArgument(mode, done) {
  loadImages(['jellyfish-1.jpeg', 'jellyfish-2.jpeg'])
    .then(([image1, image2]) => {
      const gpu = new GPU({mode});
      const originalKernel = gpu.createKernel(function (a) {
        const pixel = a[0][0];
        return pixel.b * 255;
      }, {
        output: [1],
        precision: 'unsigned',
        argumentTypes: ['HTMLImage'],
      });
      const canvas = originalKernel.canvas;
      const context = originalKernel.context;
      assert.deepEqual(originalKernel(image1)[0], 253);
      const kernelString = originalKernel.toString(image1);
      const newKernel = new Function('return ' + kernelString)()({context, canvas});
      assert.deepEqual(newKernel(image1)[0], 253);
      assert.deepEqual(newKernel(image2)[0], 255);
      gpu.destroy();
      done();
    });
}

(GPU.isWebGLSupported ? test : skip)('webgl', t => {
  testArgument('webgl', t.async());
});

(GPU.isWebGL2Supported ? test : skip)('webgl2', t => {
  testArgument('webgl2', t.async());
});


