const { assert, skip, test, module: describe } = require('qunit');
const { GPU } = require('../../src');
const { loadVideo, assertVideoFailureIsUnsupportedFormat } = require('../browser-test-utils');

describe('video');
function videoArgumentTest(mode, done) {
  // Waiting a fixed second for the video to decode and hoping is what this used
  // to do, and whenever decoding took longer the kernel sampled a video with no
  // frame in it and the assertion below failed. Wait for the frame instead.
  loadVideo('jellyfish.webm').then(video => {
    const gpu = new GPU({mode});
    const videoKernel = gpu.createKernel(function (a) {
      const pixel = a[this.thread.y][this.thread.x];
      return pixel.g * 255;
    }, {
      output: [200],
      precision: 'unsigned',
      argumentTypes: ['HTMLVideo'],
    });
    const pixelResult = videoKernel(video)[0];
    // CPU captures a bit different of a color, hence the band rather than a
    // value. Report what came back: a bare "expected argument to be truthy"
    // says nothing about which pixel was read.
    assert.ok(
      pixelResult <= 127 && pixelResult >= 121,
      `green channel ${pixelResult} within 121..127`
    );
    assert.equal(true, true, 'does not throw');
    gpu.destroy();
    done();
  }).catch(error => {
    assertVideoFailureIsUnsupportedFormat(assert, error);
    done();
  });
}

(typeof HTMLVideoElement !== 'undefined' ? test : skip)('video argument auto', t => {
  videoArgumentTest(null, t.async());
});

(typeof HTMLVideoElement !== 'undefined' ? test : skip)('video argument gpu', t => {
  videoArgumentTest('gpu', t.async());
});

(GPU.isWebGLSupported && typeof HTMLVideoElement !== 'undefined' ? test : skip)('video argument webgl', t => {
  videoArgumentTest('webgl', t.async());
});

(GPU.isWebGL2Supported && typeof HTMLVideoElement !== 'undefined' ? test : skip)('video argument webgl2', t => {
  videoArgumentTest('webgl2', t.async());
});

(typeof HTMLVideoElement !== 'undefined' ? test : skip)('video argument cpu', t => {
  videoArgumentTest('cpu', t.async());
});
