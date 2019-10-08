const { assert, skip, test, module: describe, only } = require('qunit');
const { GPU, CPUKernel } = require('../../../../../../src');

describe('feature: to-string unsigned precision constants HTMLImageArray');

function testArgument(mode, done) {
  loadImages([
    'jellyfish-1.jpeg',
    'jellyfish-2.jpeg',
    'jellyfish-3.jpeg',
    'jellyfish-4.jpeg',
  ])
    .then(([image1, image2, image3, image4]) => {
      const images1 = [image1, image2];
      const images2 = [image3, image4];
      const gpu = new GPU({mode});
      const originalKernel = gpu.createKernel(function (selection) {
        const image0 = this.constants.a[0][0][0];
        const image1 = this.constants.a[1][0][0];
        switch (selection) {
          case 0: return image0.r * 255;
          case 1: return image1.r * 255;
          case 2: return image0.b * 255;
          case 3: return image1.b * 255;
        }
      }, {
        output: [1],
        precision: 'unsigned',
        argumentTypes: ['Integer'],
        constants: {
          a: images1,
        }
      });
      assert.deepEqual(originalKernel(0)[0], 172);
      assert.deepEqual(originalKernel(1)[0], 255);
      assert.deepEqual(originalKernel(2)[0], 253);
      assert.deepEqual(originalKernel(3)[0], 255);
      const kernelString = originalKernel.toString(0);
      const canvas = originalKernel.canvas;
      const context = originalKernel.context;
      const Kernel = new Function('return ' + kernelString)();
      const newKernel1 = Kernel({context, canvas, constants: { a: images1 }});
      assert.deepEqual(newKernel1(0)[0], 172);
      assert.deepEqual(newKernel1(1)[0], 255);
      assert.deepEqual(newKernel1(2)[0], 253);
      assert.deepEqual(newKernel1(3)[0], 255);

      const newKernel2 = Kernel({context, canvas, constants: { a: images2 }});
      assert.deepEqual(newKernel2(0)[0], 0);
      assert.deepEqual(newKernel2(1)[0], 73);
      assert.deepEqual(newKernel2(2)[0], 255);
      assert.deepEqual(newKernel2(3)[0], 253);
      gpu.destroy();
      done(originalKernel, newKernel1);
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
