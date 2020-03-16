const { assert, skip, test, module: describe, only } = require('qunit');
const { GPU } = require('../../src');

describe('features: clear textures');

function clearTexture(precision, mode) {
  const gpu = new GPU({ mode });
  function makeTexture() {
    return (gpu.createKernel(function() {
      return this.thread.x;
    }, {
      output: [5],
      pipeline: true,
      precision
    }))();
  }
  const texture = makeTexture();
  assert.deepEqual(texture.toArray(), new Float32Array([0,1,2,3,4]));
  texture.clear();
  const texture2 = makeTexture(); // put another texture in the way
  assert.deepEqual(texture.toArray(), new Float32Array([0,0,0,0,0]));
  assert.deepEqual(texture2.toArray(), new Float32Array([0,1,2,3,4]));
  gpu.destroy();
}

test('unsigned precision auto', () => {
  clearTexture('unsigned');
});

(GPU.isWebGLSupported ? test : skip)('unsigned precision webgl', () => {
  clearTexture('unsigned', 'webgl');
});

(GPU.isWebGL2Supported ? test : skip)('unsigned precision webgl2', () => {
  clearTexture('unsigned', 'webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('unsigned precision headlessgl', () => {
  clearTexture('unsigned', 'headlessgl');
});

(GPU.isSinglePrecisionSupported ? test : skip)('single precision auto', () => {
  clearTexture('single');
});

(GPU.isSinglePrecisionSupported && GPU.isWebGLSupported ? test : skip)('single precision webgl', () => {
  clearTexture('single', 'webgl');
});

(GPU.isSinglePrecisionSupported && GPU.isWebGL2Supported ? test : skip)('single precision webgl2', () => {
  clearTexture('single', 'webgl2');
});

(GPU.isSinglePrecisionSupported && GPU.isHeadlessGLSupported ? test : skip)('single precision headlessgl', () => {
  clearTexture('single', 'headlessgl');
});


function clearClonedTexture(mode) {
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function() {
    return 1;
  }, { output: [1], pipeline: true, immutable: true });
  const result = kernel();
  assert.equal(result.toArray()[0], 1);
  const result2 = result.clone();
  const result3 = result2.clone();
  assert.equal(result2.toArray()[0], 1);
  assert.equal(result3.toArray()[0], 1);
  result2.clear();
  assert.equal(result2.toArray()[0], 0);
  assert.equal(result3.toArray()[0], 1);
  gpu.destroy();
}

test('clear cloned texture auto', () => {
  clearClonedTexture();
});

test('clear cloned texture gpu', () => {
  clearClonedTexture('gpu');
});

(GPU.isWebGLSupported ? test : skip)('clear cloned texture webgl', () => {
  clearClonedTexture('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('clear cloned texture webgl2', () => {
  clearClonedTexture('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('clear cloned texture headlessgl', () => {
  clearClonedTexture('headlessgl');
});