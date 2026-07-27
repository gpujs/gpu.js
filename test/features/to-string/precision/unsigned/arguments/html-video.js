const { assert, skip, test, module: describe, only } = require('qunit');
const { GPU } = require('../../../../../../src');
const { loadVideo, assertVideoFailureIsUnsupportedFormat } = require('../../../../../browser-test-utils');

describe('feature: to-string unsigned precision arguments HTMLVideo');

function testArgument(mode, done) {
  // jellyfish.webm carries no Cues index, so its only seekable position is 0 --
  // the `video.currentTime = 2` this used to do was silently clamped away and
  // the first frame was always what got sampled. Waiting a fixed second after
  // canplay and hoping a frame had arrived is what made it flaky.
  loadVideo('jellyfish.webm').then(video => {
    const gpu = new GPU({mode});
    const originalKernel = gpu.createKernel(function (a) {
      const pixel = a[0][0];
      return pixel.g * 255;
    }, {
      output: [1],
      precision: 'unsigned',
      argumentTypes: ['HTMLVideo'],
    });
    const canvas = originalKernel.canvas;
    const context = originalKernel.context;
    // The exact green value of this frame belongs to the decoder, not to
    // gpu.js -- WebGL reads 127 and the CPU backend 121 from the very same
    // frame, which is the band test/features/video.js documents. What this
    // test is actually for is that the regenerated kernel agrees with the
    // kernel it came from, so assert that, against a sanity check.
    const expected = originalKernel(video)[0];
    assert.ok(expected >= 121 && expected <= 127, `green channel ${expected} within the expected range`);
    const kernelString = originalKernel.toString(video);
    const newKernel = new Function('return ' + kernelString)()({context, canvas});
    assert.deepEqual(newKernel(video)[0], expected);
    gpu.destroy();
    done();
  }).catch(error => {
    assertVideoFailureIsUnsupportedFormat(assert, error);
    done();
  });
}

(GPU.isWebGLSupported ? test : skip)('webgl', t => {
  testArgument('webgl', t.async());
});

(GPU.isWebGL2Supported ? test : skip)('webgl2', t => {
  testArgument('webgl2', t.async());
});


