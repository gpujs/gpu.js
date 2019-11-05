const { assert, skip, test, module: describe, only } = require('qunit');
const { GPU } = require('../../../../../../src');

describe('feature: to-string single precision arguments HTMLVideo');

function testArgument(mode, done) {
  const video = document.createElement('video');
  video.currentTime = 2;
  video.src = 'jellyfish.webm';
  video.oncanplay = (e) => {
    video.oncanplay = null;
    setTimeout(() => {
      const gpu = new GPU({mode});
      const originalKernel = gpu.createKernel(function (a) {
        const pixel = a[0][0];
        return pixel.g * 255;
      }, {
        output: [1],
        precision: 'single',
        argumentTypes: ['HTMLVideo'],
      });
      const canvas = originalKernel.canvas;
      const context = originalKernel.context;
      assert.deepEqual(originalKernel(video)[0], 125);
      const kernelString = originalKernel.toString(video);
      const newKernel = new Function('return ' + kernelString)()({context, canvas});
      assert.deepEqual(newKernel(video)[0], 125);
      gpu.destroy();
      done();
    }, 1000);
  }
}

(GPU.isWebGLSupported ? test : skip)('webgl', t => {
  testArgument('webgl', t.async());
});

(GPU.isWebGL2Supported ? test : skip)('webgl2', t => {
  testArgument('webgl2', t.async());
});


