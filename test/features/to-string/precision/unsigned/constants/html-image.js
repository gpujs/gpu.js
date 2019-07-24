const { assert, skip, test, module: describe, only } = require('qunit');
const { GPU, utils } = require('../../../../../../src');
const { loadImage, imageToArray, check2DImage } = require('../../../../../browser-test-utils');

describe('feature: to-string unsigned precision constants HTMLImage');

function testArgument(mode, done) {
  const image = document.createElement('img');
  image.src = 'jellyfish.jpeg';
  loadImage(image)
    .then(() => {
      const expected = imageToArray(image);
      const result = utils.splitHTMLImageToRGB(image, mode);
      const [r,g,b,a] = result;
      const {rKernel, gKernel, bKernel, aKernel, gpu} = result;
      const canvas = rKernel.canvas;
      const context = rKernel.context;

      // For visual feedback
      let visualCanvases = null;
      try {
        visualCanvases = utils.splitRGBAToCanvases(expected, image.width, image.height);
        document.body.appendChild(visualCanvases[0]);
        document.body.appendChild(visualCanvases[1]);
        document.body.appendChild(visualCanvases[2]);
        document.body.appendChild(visualCanvases[3]);
        check2DImage(r, expected, 0);
        check2DImage(g, expected, 1);
        check2DImage(b, expected, 2);
        check2DImage(a, expected, 3);
        const rKernelString = rKernel.toString(image);
        const gKernelString = gKernel.toString(image);
        const bKernelString = bKernel.toString(image);
        const aKernelString = aKernel.toString(image);
        const newRKernel = new Function('return ' + rKernelString)()({context, canvas});
        const newGKernel = new Function('return ' + gKernelString)()({context, canvas});
        const newBKernel = new Function('return ' + bKernelString)()({context, canvas});
        const newAKernel = new Function('return ' + aKernelString)()({context, canvas});
        assert.ok(check2DImage(newRKernel(image), expected, 0));
        assert.ok(check2DImage(newGKernel(image), expected, 1));
        assert.ok(check2DImage(newBKernel(image), expected, 2));
        assert.ok(check2DImage(newAKernel(image), expected, 3));
        document.body.removeChild(visualCanvases[0]);
        document.body.removeChild(visualCanvases[1]);
        document.body.removeChild(visualCanvases[2]);
        document.body.removeChild(visualCanvases[3]);
      } finally {
        gpu.destroy();
        done();
      }
    });
}

(GPU.isWebGLSupported ? test : skip)('webgl', t => {
  testArgument('webgl', t.async());
});

(GPU.isWebGL2Supported ? test : skip)('webgl2', t => {
  testArgument('webgl2', t.async());
});


