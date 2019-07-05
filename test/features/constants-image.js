const { assert, skip, test, module: describe } = require('qunit');
const { GPU } = require('../../src');

describe('features: constants image');
function imageConstantTest(mode, done) {
  const gpu = new GPU({ mode });
  const image = new Image();
  image.src = 'jellyfish-1.jpeg';
  image.onload = function() {
    const width = image.width;
    const height = image.height;
    const tryConst = gpu.createKernel(
      function() {
        const pixel = this.constants.image[this.thread.y][this.thread.x];
        let color = 0;
        if (this.thread.z === 0) {
          color = pixel.r;
        }
        if (this.thread.z === 1) {
          color = pixel.g;
        }
        if (this.thread.z === 2) {
          color = pixel.b;
        }
        return 255 * color;
      },
      {
        constants: { image },
        output: [width, height, 3],
      }
    );
    const result = tryConst();
    const test = result[0][0][0] > 0;
    assert.ok(test, 'image constant passed test');
    gpu.destroy();
    done();
  }
}

(typeof Image !== 'undefined' ? test : skip)('auto', t => {
  imageConstantTest(null, t.async());
});

(typeof Image !== 'undefined' ? test : skip)('gpu', t => {
  imageConstantTest('gpu', t.async());
});

(GPU.isWebGLSupported && typeof Image !== 'undefined' ? test : skip)('webgl', t => {
  imageConstantTest('webgl', t.async());
});

(GPU.isWebGL2Supported && typeof Image !== 'undefined' ? test : skip)('webgl2', t => {
  imageConstantTest('webgl2', t.async());
});

(typeof Image !== 'undefined' ? test : skip)('cpu', t => {
  imageConstantTest('cpu', t.async());
});
