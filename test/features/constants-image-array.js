const { assert, skip, test, module: describe } = require('qunit');
const { GPU, WebGLKernel } = require('../../src');

describe('features: constants image array');
function feature(mode, done) {
  const gpu = new GPU({ mode });
  const image = new Image();
  const imageArray = [image, image];
  function fn() {
    const pixel1 = this.constants.imageArray[0][this.thread.y][this.thread.x];
    const pixel2 = this.constants.imageArray[1][this.thread.y][this.thread.x];
    let color = 0;
    if (this.thread.z === 0) {
      color = (pixel1.r + pixel2.r) / 2;
    }
    if (this.thread.z === 1) {
      color = (pixel1.g + pixel2.g) / 2;
    }
    if (this.thread.z === 2) {
      color = (pixel1.b + pixel2.b) / 2;
    }
    if (this.thread.z === 3) {
      color = 1;
    }
    return Math.floor(255 * color);
  }
  const settings = {
    constants: { imageArray },
    output: [1, 1, 4]
  };

  if (mode === 'webgl' || gpu.Kernel === WebGLKernel) {
    // make fail early in this exact scenario
    gpu.createKernel(fn, settings)();
  }

  image.src = 'jellyfish-1.jpeg';
  image.onload = () => {
    settings[0] = image.width;
    settings[1] = image.height;
    const tryConst = gpu.createKernel(fn, settings);
    const result = tryConst();
    assert.ok(result[0][0][0] > 0, 'image array constant passed test');
    gpu.destroy();
    done();
  };
}

(GPU.isGPUHTMLImageArraySupported && typeof Image !== 'undefined' ? test : skip)('auto', t => {
  feature(null, t.async());
});

(GPU.isGPUHTMLImageArraySupported && typeof Image !== 'undefined' ? test : skip)('gpu', t => {
  feature('gpu', t.async());
});

(GPU.isWebGLSupported && typeof Image !== 'undefined' ? test : skip)('webgl', t => {
  assert.throws(() => {
    feature('webgl')
  }, 'imageArray are not compatible with webgl');
});

(GPU.isWebGL2Supported && typeof Image !== 'undefined' ? test : skip)('webgl2', t => {
  feature('webgl2', t.async());
});

(typeof Image !== 'undefined' ? test : skip)('cpu', t => {
  feature('cpu', t.async());
});
