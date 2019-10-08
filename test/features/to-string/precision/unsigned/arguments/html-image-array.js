const { assert, skip, test, module: describe, only } = require('qunit');
const { GPU, CPUKernel } = require('../../../../../../src');

describe('feature: to-string unsigned precision arguments HTMLImageArray');

function testArgument(mode, done) {
  loadImages([
    'jellyfish-1.jpeg',
    'jellyfish-2.jpeg',
    'jellyfish-3.jpeg',
    'jellyfish-4.jpeg',
  ])
    .then(([image1, image2, image3, image4]) => {
      const imagesArray1 = [image1, image2];
      const imagesArray2 = [image3, image4];
      const gpu = new GPU({mode});
      const originalKernel = gpu.createKernel(function (a, selection) {
        const image0 = a[0][0][0];
        const image1 = a[1][0][0];
        switch (selection) {
          case 0: return image0.r * 255;
          case 1: return image1.r * 255;
          case 2: return image0.g * 255;
          case 3: return image1.g * 255;
        }
      }, {
        output: [1],
        precision: 'unsigned',
        argumentTypes: ['HTMLImageArray', 'Integer'],
      });
      assert.deepEqual(originalKernel(imagesArray1, 0)[0], 172);
      assert.deepEqual(originalKernel(imagesArray1, 1)[0], 255);
      assert.deepEqual(originalKernel(imagesArray2, 2)[0], 87);
      assert.deepEqual(originalKernel(imagesArray2, 3)[0], 110);
      const kernelString = originalKernel.toString(imagesArray1, 0);
      const canvas = originalKernel.canvas;
      const context = originalKernel.context;
      const newKernel = new Function('return ' + kernelString)()({context, canvas});
      assert.deepEqual(newKernel(imagesArray1, 0)[0], 172);
      assert.deepEqual(newKernel(imagesArray1, 1)[0], 255);
      assert.deepEqual(newKernel(imagesArray2, 2)[0], 87);
      assert.deepEqual(newKernel(imagesArray2, 3)[0], 110);
      gpu.destroy();
      done(originalKernel, newKernel);
    });
}

(GPU.isWebGLSupported ? test : skip)('webgl', t => {
  const done = t.async();
  testArgument('webgl', (kernel) => {
    // They aren't supported, so test that kernel falls back
    assert.equal(kernel.kernel.constructor, CPUKernel);
    done();
  });
});

(GPU.isWebGL2Supported ? test : skip)('webgl2', t => {
  testArgument('webgl2', t.async());
});
