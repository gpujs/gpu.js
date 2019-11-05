const { assert, skip, test, module: describe, only } = require('qunit');
const { GPU } = require('../../src');

describe('features: clone textures');

function copy1DTexture(precision, mode) {
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
  const cloneKernel = texture._getCloneKernel();
  assert.deepEqual(texture.toArray(), texture.clone().toArray());
  assert.equal(texture.clone()._getCloneKernel(), cloneKernel);
  gpu.destroy();
}

test('1D unsigned precision auto', () => {
  copy1DTexture('unsigned');
});

(GPU.isWebGLSupported ? test : skip)('1D unsigned precision webgl', () => {
  copy1DTexture('unsigned', 'webgl');
});

(GPU.isWebGL2Supported ? test : skip)('1D unsigned precision webgl2', () => {
  copy1DTexture('unsigned', 'webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('1D unsigned precision headlessgl', () => {
  copy1DTexture('unsigned', 'headlessgl');
});

(GPU.isSinglePrecisionSupported ? test : skip)('1D single precision auto', () => {
  copy1DTexture('single');
});

(GPU.isSinglePrecisionSupported && GPU.isWebGLSupported ? test : skip)('1D single precision webgl', () => {
  copy1DTexture('single', 'webgl');
});

(GPU.isSinglePrecisionSupported && GPU.isWebGL2Supported ? test : skip)('1D single precision webgl2', () => {
  copy1DTexture('single', 'webgl2');
});

(GPU.isSinglePrecisionSupported && GPU.isHeadlessGLSupported ? test : skip)('1D single precision headlessgl', () => {
  copy1DTexture('single', 'headlessgl');
});

function copy2DTexture(precision, mode) {
  const gpu = new GPU({ mode });
  function makeTexture() {
    return (gpu.createKernel(function() {
      return this.thread.x + (this.thread.y * this.output.x);
    }, {
      output: [5, 5],
      pipeline: true,
      precision
    }))();
  }
  const texture = makeTexture();
  const cloneKernel = texture._getCloneKernel();
  assert.deepEqual(texture.toArray(), texture.clone().toArray());
  assert.equal(texture.clone()._getCloneKernel(), cloneKernel);
  gpu.destroy();
}

test('2D unsigned precision auto', () => {
  copy2DTexture('unsigned');
});

(GPU.isWebGLSupported ? test : skip)('2D unsigned precision webgl', () => {
  copy2DTexture('unsigned', 'webgl');
});

(GPU.isWebGL2Supported ? test : skip)('2D unsigned precision webgl2', () => {
  copy2DTexture('unsigned', 'webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('2D unsigned precision headlessgl', () => {
  copy2DTexture('unsigned', 'headlessgl');
});

(GPU.isSinglePrecisionSupported ? test : skip)('2D single precision auto', () => {
  copy2DTexture('single');
});

(GPU.isSinglePrecisionSupported && GPU.isWebGLSupported ? test : skip)('2D single precision webgl', () => {
  copy2DTexture('single', 'webgl');
});

(GPU.isSinglePrecisionSupported && GPU.isWebGL2Supported ? test : skip)('2D single precision webgl2', () => {
  copy2DTexture('single', 'webgl2');
});

(GPU.isSinglePrecisionSupported && GPU.isHeadlessGLSupported ? test : skip)('2D single precision headlessgl', () => {
  copy2DTexture('single', 'headlessgl');
});

function copy3DTexture(precision, mode) {
  const gpu = new GPU({ mode });
  function makeTexture() {
    return (gpu.createKernel(function() {
      return this.thread.x + (this.thread.y * this.output.x) * (this.output.x * this.output.y * this.thread.z);
    }, {
      output: [5, 5, 5],
      pipeline: true,
      precision
    }))();
  }
  const texture = makeTexture();
  const cloneKernel = texture._getCloneKernel();
  assert.deepEqual(texture.toArray(), texture.clone().toArray());
  assert.equal(texture.clone()._getCloneKernel(), cloneKernel);
  gpu.destroy();
}

test('3D unsigned precision auto', () => {
  copy3DTexture('unsigned');
});

(GPU.isWebGLSupported ? test : skip)('3D unsigned precision webgl', () => {
  copy3DTexture('unsigned', 'webgl');
});

(GPU.isWebGL2Supported ? test : skip)('3D unsigned precision webgl2', () => {
  copy3DTexture('unsigned', 'webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('3D unsigned precision headlessgl', () => {
  copy3DTexture('unsigned', 'headlessgl');
});

(GPU.isSinglePrecisionSupported ? test : skip)('3D single precision auto', () => {
  copy3DTexture('single');
});

(GPU.isSinglePrecisionSupported && GPU.isWebGLSupported ? test : skip)('3D single precision webgl', () => {
  copy3DTexture('single', 'webgl');
});

(GPU.isSinglePrecisionSupported && GPU.isWebGL2Supported ? test : skip)('3D single precision webgl2', () => {
  copy3DTexture('single', 'webgl2');
});

(GPU.isSinglePrecisionSupported && GPU.isHeadlessGLSupported ? test : skip)('3D single precision headlessgl', () => {
  copy3DTexture('single', 'headlessgl');
});
