const { assert, skip, test, module: describe } = require('qunit');
const { GPU } = require('../../src');

describe('image');
function imageArgumentTest(mode, done) {
  const gpu = new GPU({ mode });
  const image = document.createElement('img');
  image.src = 'jellyfish-1.jpeg';
  image.onload = function() {
    const imageKernel = gpu.createKernel(function(image) {
      const pixel = image[this.thread.y][this.thread.x];
      this.color(pixel[0], pixel[1], pixel[2], pixel[3]);
    }, {
      graphical: true,
      output : [image.width, image.height]
    });
    imageKernel(image);
    assert.equal(true, true, 'does not throw');
    gpu.destroy();
    done();
  };
}

(typeof Image !== 'undefined' ? test : skip)('image argument auto', t => {
  imageArgumentTest(null, t.async());
});

(typeof Image !== 'undefined' ? test : skip)('image argument gpu', t => {
  imageArgumentTest('gpu', t.async());
});

(GPU.isWebGLSupported && typeof Image !== 'undefined' ? test : skip)('image argument webgl', t => {
  imageArgumentTest('webgl', t.async());
});

(GPU.isWebGL2Supported && typeof Image !== 'undefined' ? test : skip)('image argument webgl2', t => {
  imageArgumentTest('webgl2', t.async());
});

(typeof Image !== 'undefined' ? test : skip)('image argument cpu', t => {
  imageArgumentTest('cpu', t.async());
});
