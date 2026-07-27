const { assert, skip, test, module: describe } = require('qunit');
const { GPU } = require('../../src');

describe('features: read from image bitmap');

function readImageBitmap(mode, done) {
  const gpu = new GPU({ mode });
  const image = new Image();
  image.src = 'jellyfish.jpeg';
  const kernel = gpu.createKernel(function(image) {
    const pixel = image[this.thread.y][this.thread.x];
    return pixel[0] + pixel[1] + pixel[2] + pixel[3];
  }, {
    output: [1]
  });
  image.onload = async function() {
    const imageBitmap = await createImageBitmap(image, 0, 0, 1, 1);

    // What this test guards is that an ImageBitmap can be read at all -- the
    // exact channel values belong to the browser, twice over. The JPEG decode
    // itself varies by a bit per channel (Safari lands on 3.23), and the WebGL
    // texture upload may additionally apply color management the 2D canvas
    // does not (Firefox on Windows lands on 3.07 for the same bitmap its own
    // 2D decode reads as 3.22). So: compare against this browser's own decode
    // of the same bitmap, with a band wide enough for an upload-path shift but
    // far too narrow for the real failures -- a zero read, an all-white read,
    // or garbage.
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 1;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    context.drawImage(imageBitmap, 0, 0);
    const data = context.getImageData(0, 0, 1, 1).data;
    const expected = (data[0] + data[1] + data[2] + data[3]) / 255;

    const result = kernel(imageBitmap);
    assert.equal(result.length, 1);
    assert.ok(
      Math.abs(result[0] - expected) < 0.2,
      `read ${result[0]}, browser's own decode gives ${expected.toFixed(2)}`
    );
    await gpu.destroy();
    done();
  };
}

(typeof Image !== 'undefined' ? test : skip)('readImageBitmap auto', (assert) => {
  readImageBitmap(null, assert.async());
});

(typeof Image !== 'undefined' ? test : skip)('readImageBitmap gpu', (assert) => {
  readImageBitmap('gpu', assert.async());
});

(GPU.isWebGLSupported && typeof Image !== 'undefined' ? test : skip)('readImageBitmap webgl', (assert) => {
  readImageBitmap('webgl', assert.async());
});

(GPU.isWebGL2Supported && typeof Image !== 'undefined' ? test : skip)('readImageBitmap webgl2', (assert) => {
  readImageBitmap('webgl2', assert.async());
});

(GPU.isHeadlessGLSupported && typeof Image !== 'undefined' ? test : skip)('readImageBitmap headlessgl', (assert) => {
  readImageBitmap('headlessgl', assert.async());
});

(typeof Image !== 'undefined' ? test : skip)('readImageBitmap cpu', (assert) => {
  readImageBitmap('cpu', assert.async());
});
