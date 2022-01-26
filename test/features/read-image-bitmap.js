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
    const imageBitmapPromise = createImageBitmap(image, 0, 0, 1, 1);
    const imageBitmap = await imageBitmapPromise;
    const result = kernel(imageBitmap);
    assert.equal(result.length, 1);
    assert.equal(result[0].toFixed(2), 3.22);
    await gpu.destroy();
    done();
  };
}

test('readImageBitmap auto', (assert) => {
  readImageBitmap(null, assert.async());
});

test('readImageBitmap gpu', (assert) => {
  readImageBitmap('gpu', assert.async());
});

(GPU.isWebGLSupported ? test : skip)('readImageBitmap webgl', (assert) => {
  readImageBitmap('webgl', assert.async());
});

(GPU.isWebGL2Supported ? test : skip)('readImageBitmap webgl2', (assert) => {
  readImageBitmap('webgl2', assert.async());
});

(GPU.isHeadlessGLSupported ? test : skip)('readImageBitmap headlessgl', (assert) => {
  readImageBitmap('headlessgl', assert.async());
});

test('readImageBitmap cpu', (assert) => {
  readImageBitmap('cpu', assert.async());
});
