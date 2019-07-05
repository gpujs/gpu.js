const { assert, skip, test, module: describe, only } = require('qunit');
const { GPU, CPUKernel } = require('../../../../../../src');

describe('feature: to-string unsigned precision constants HTMLImageArray');

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
    const originalKernel = gpu.createKernel(function (selection) {
      const image0 = this.constants.a[0][0][0];
      const image1 = this.constants.a[1][0][0];
      const image2 = this.constants.a[2][0][0];
      const image3 = this.constants.a[3][0][0];
      switch (selection) {
        case 0: return image0.r * 255;
        case 1: return image1.r * 255;
        case 2: return image2.r * 255;
        case 3: return image3.r * 255;
      }
    }, {
      output: [1],
      precision: 'unsigned',
      argumentTypes: ['Integer'],
      constants: {
        a: images,
      }
    });
    assert.deepEqual(originalKernel(0)[0], 172);
    assert.deepEqual(originalKernel(1)[0], 255);
    assert.deepEqual(originalKernel(2)[0], 0);
    assert.deepEqual(originalKernel(3)[0], 73);
    const kernelString = originalKernel.toString(0);
    const canvas = originalKernel.canvas;
    const context = originalKernel.context;
    const newKernel = new Function('return ' + kernelString)()({context, canvas, constants: { a: images }});
    assert.deepEqual(newKernel(0)[0], 172);
    assert.deepEqual(newKernel(1)[0], 255);
    assert.deepEqual(newKernel(2)[0], 0);
    assert.deepEqual(newKernel(3)[0], 73);
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
