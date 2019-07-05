const { assert, skip, test, module: describe, only } = require('qunit');
const { GPU, CPUKernel } = require('../../../../../../src');

describe('feature: to-string unsigned precision arguments HTMLImageArray');

function testArgument(mode, done) {
  const imageSources = [
    'jellyfish-1.jpeg',
    'jellyfish-2.jpeg',
    'jellyfish-3.jpeg',
    'jellyfish-4.jpeg',
  ];
  let loaded = 0;
  const images = imageSources.map(imageSource => {
    const image = new Image();
    image.src = imageSource;
    image.onload = () => {
      loaded++;
      if (loaded === imageSources.length) {
        allLoaded();
      }
    };
    return image;
  });

  function allLoaded() {
    const gpu = new GPU({mode});
    const originalKernel = gpu.createKernel(function (a, selection) {
      const image0 = a[0][0][0];
      const image1 = a[1][0][0];
      const image2 = a[2][0][0];
      const image3 = a[3][0][0];
      switch (selection) {
        case 0: return image0.r * 255;
        case 1: return image1.r * 255;
        case 2: return image2.r * 255;
        case 3: return image3.r * 255;
      }
    }, {
      output: [1],
      precision: 'unsigned',
      argumentTypes: ['HTMLImageArray', 'Integer'],
    });
    assert.deepEqual(originalKernel(images, 0)[0], 172);
    assert.deepEqual(originalKernel(images, 1)[0], 255);
    assert.deepEqual(originalKernel(images, 2)[0], 0);
    assert.deepEqual(originalKernel(images, 3)[0], 73);
    const kernelString = originalKernel.toString(images, 0);
    const canvas = originalKernel.canvas;
    const context = originalKernel.context;
    const newKernel = new Function('return ' + kernelString)()({context, canvas});
    assert.deepEqual(newKernel(images, 0)[0], 172);
    assert.deepEqual(newKernel(images, 1)[0], 255);
    assert.deepEqual(newKernel(images, 2)[0], 0);
    assert.deepEqual(newKernel(images, 3)[0], 73);
    gpu.destroy();
    done(originalKernel, newKernel);
  }
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
