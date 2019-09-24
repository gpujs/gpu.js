const { assert, skip, test, module: describe } = require('qunit');
const { GPU } = require('../../src');

describe('video');
function videoArgumentTest(mode, done) {
  const video = document.createElement('video');
  video.src = 'jellyfish.webm';
  setTimeout(() => {
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
    // CPU captures a bit different of a color
    assert.ok(pixelResult <= 127 && pixelResult >= 121);
    assert.equal(true, true, 'does not throw');
    gpu.destroy();
    done();
  }, 1000);
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
