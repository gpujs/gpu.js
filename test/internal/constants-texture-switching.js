const { assert, skip, test, module: describe, only } = require('qunit');
const { GPU } = require('../../dist/gpu.js');

describe('internal: constants texture switching');

function testArray1D2(mode) {
  const gpu = new GPU({ mode });
  const texture = (
    gpu.createKernel(function() { return [this.thread.x, this.thread.x + 1]; })
      .setOutput([10])
      .setPipeline(true)
      .setPrecision('single')
  )();
  const expected = texture.toArray();
  const kernel = gpu.createKernel(function() {
    return this.constants.value[this.thread.x];
  })
    .setConstants({
      value: texture
    })
    .setConstantTypes({
      value: 'Array1D(2)'
    })
    .setOutput([10])
    .setPipeline(false)
    .setPrecision('single');

  assert.notEqual(texture.constructor, Array);
  assert.equal(expected.constructor, Array);
  assert.deepEqual(kernel(), expected);
  gpu.destroy();
}

(GPU.isSinglePrecisionSupported ? test : skip)('Array1D(2) (GPU only) auto', () => {
  testArray1D2();
});

(GPU.isSinglePrecisionSupported ? test : skip)('Array1D(2) (GPU only) gpu', () => {
  testArray1D2('gpu');
});

(GPU.isSinglePrecisionSupported && GPU.isWebGLSupported ? test : skip)('Array1D(2) (GPU only) webgl', () => {
  testArray1D2('webgl');
});

(GPU.isSinglePrecisionSupported && GPU.isWebGL2Supported ? test : skip)('Array1D(2) (GPU only) webgl2', () => {
  testArray1D2('webgl2');
});

(GPU.isSinglePrecisionSupported && GPU.isHeadlessGLSupported ? test : skip)('Array1D(2) (GPU only) headlessgl', () => {
  testArray1D2('headlessgl');
});

function testArray1D3(mode) {
  const gpu = new GPU({ mode });
  const texture = (
    gpu.createKernel(function() { return [this.thread.x, this.thread.x + 1, this.thread.x + 2]; })
      .setOutput([10])
      .setPipeline(true)
      .setPrecision('single')
  )();
  const expected = texture.toArray();
  const kernel = gpu.createKernel(function() {
    return this.constants.value[this.thread.x];
  })
    .setConstants({
      value: texture
    })
    .setConstantTypes({
      value: 'Array1D(2)'
    })
    .setOutput([10])
    .setPipeline(false)
    .setPrecision('single');

  assert.notEqual(texture.constructor, Array);
  assert.equal(expected.constructor, Array);
  assert.deepEqual(kernel(), expected);
  gpu.destroy();
}

(GPU.isSinglePrecisionSupported ? test : skip)('Array1D(3) (GPU only) auto', () => {
  testArray1D3();
});

(GPU.isSinglePrecisionSupported ? test : skip)('Array1D(3) (GPU only) gpu', () => {
  testArray1D3('gpu');
});

(GPU.isSinglePrecisionSupported && GPU.isWebGLSupported ? test : skip)('Array1D(3) (GPU only) webgl', () => {
  testArray1D3('webgl');
});

(GPU.isSinglePrecisionSupported && GPU.isWebGL2Supported ? test : skip)('Array1D(3) (GPU only) webgl2', () => {
  testArray1D3('webgl2');
});

(GPU.isSinglePrecisionSupported && GPU.isHeadlessGLSupported ? test : skip)('Array1D(3) (GPU only) headlessgl', () => {
  testArray1D3('headlessgl');
});

function testArray1D4(mode) {
  const gpu = new GPU({ mode });
  const texture = (
    gpu.createKernel(function() { return [this.thread.x, this.thread.x + 1, this.thread.x + 2, this.thread.x + 3]; })
      .setOutput([10])
      .setPipeline(true)
      .setPrecision('single')
  )();
  const expected = texture.toArray();
  const kernel = gpu.createKernel(function() {
    return this.constants.value[this.thread.x];
  })
    .setConstants({
      value: texture
    })
    .setConstantTypes({
      value: 'Array1D(2)'
    })
    .setOutput([10])
    .setPipeline(false)
    .setPrecision('single');

  assert.notEqual(texture.constructor, Array);
  assert.equal(expected.constructor, Array);
  assert.deepEqual(kernel(), expected);
  gpu.destroy();
}

(GPU.isSinglePrecisionSupported ? test : skip)('Array1D(4) (GPU only) auto', () => {
  testArray1D4();
});

(GPU.isSinglePrecisionSupported ? test : skip)('Array1D(4) (GPU only) gpu', () => {
  testArray1D4('gpu');
});

(GPU.isSinglePrecisionSupported && GPU.isWebGLSupported ? test : skip)('Array1D(4) (GPU only) webgl', () => {
  testArray1D4('webgl');
});

(GPU.isSinglePrecisionSupported && GPU.isWebGL2Supported ? test : skip)('Array1D(4) (GPU only) webgl2', () => {
  testArray1D4('webgl2');
});

(GPU.isSinglePrecisionSupported && GPU.isHeadlessGLSupported ? test : skip)('Array1D(4) (GPU only) headlessgl', () => {
  testArray1D4('headlessgl');
});

function testArray2D2(mode) {
  const gpu = new GPU({ mode });
  const texture = (
    gpu.createKernel(function() { return [this.thread.x, this.thread.y]; })
      .setOutput([10, 10])
      .setPipeline(true)
      .setPrecision('single')
  )();
  const expected = texture.toArray();
  const kernel = gpu.createKernel(function() {
    return this.constants.value[this.thread.y][this.thread.x];
  })
    .setConstants({
      value: texture
    })
    .setConstantTypes({
      value: 'Array1D(2)'
    })
    .setOutput([10, 10])
    .setPipeline(false)
    .setPrecision('single');

  assert.notEqual(texture.constructor, Array);
  assert.equal(expected.constructor, Array);
  assert.deepEqual(kernel(), expected);
  gpu.destroy();
}

(GPU.isSinglePrecisionSupported ? test : skip)('Array2D(2) (GPU only) auto', () => {
  testArray2D2();
});

(GPU.isSinglePrecisionSupported ? test : skip)('Array2D(2) (GPU only) gpu', () => {
  testArray2D2('gpu');
});

(GPU.isSinglePrecisionSupported && GPU.isWebGLSupported ? test : skip)('Array2D(2) (GPU only) webgl', () => {
  testArray2D2('webgl');
});

(GPU.isSinglePrecisionSupported && GPU.isWebGL2Supported ? test : skip)('Array2D(2) (GPU only) webgl2', () => {
  testArray2D2('webgl2');
});

(GPU.isSinglePrecisionSupported && GPU.isHeadlessGLSupported ? test : skip)('Array2D(2) (GPU only) headlessgl', () => {
  testArray2D2('headlessgl');
});

function testArray2D3(mode) {
  const gpu = new GPU({ mode });
  const texture = (
    gpu.createKernel(function() { return [this.thread.x, this.thread.y, this.thread.x * this.thread.y]; })
      .setOutput([10, 10])
      .setPipeline(true)
      .setPrecision('single')
  )();
  const expected = texture.toArray();
  const kernel = gpu.createKernel(function() {
    return this.constants.value[this.thread.y][this.thread.x];
  })
    .setConstants({
      value: texture
    })
    .setConstantTypes({
      value: 'Array1D(2)'
    })
    .setOutput([10, 10])
    .setPipeline(false)
    .setPrecision('single');

  assert.notEqual(texture.constructor, Array);
  assert.equal(expected.constructor, Array);
  assert.deepEqual(kernel(), expected);
  gpu.destroy();
}

(GPU.isSinglePrecisionSupported ? test : skip)('Array2D(3) (GPU only) auto', () => {
  testArray2D3();
});

(GPU.isSinglePrecisionSupported ? test : skip)('Array1D(3) (GPU only) gpu', () => {
  testArray2D3('gpu');
});

(GPU.isSinglePrecisionSupported && GPU.isWebGLSupported ? test : skip)('Array2D(3) (GPU only) webgl', () => {
  testArray2D3('webgl');
});

(GPU.isSinglePrecisionSupported && GPU.isWebGL2Supported ? test : skip)('Array2D(3) (GPU only) webgl2', () => {
  testArray2D3('webgl2');
});

(GPU.isSinglePrecisionSupported && GPU.isHeadlessGLSupported ? test : skip)('Array2D(3) (GPU only) headlessgl', () => {
  testArray2D3('headlessgl');
});

function testArray2D4(mode) {
  const gpu = new GPU({ mode });
  const texture = (
    gpu.createKernel(function() {
      return [
        this.thread.x,
        this.thread.y,
        this.thread.x * this.thread.y,
        this.thread.x / this.thread.y
      ];
    })
      .setOutput([10, 10])
      .setPipeline(true)
      .setPrecision('single')
  )();
  const expected = texture.toArray();
  const kernel = gpu.createKernel(function() {
    return this.constants.value[this.thread.y][this.thread.x];
  })
    .setConstants({
      value: texture
    })
    .setConstantTypes({
      value: 'Array1D(2)'
    })
    .setOutput([10, 10])
    .setPipeline(false)
    .setPrecision('single');

  assert.notEqual(texture.constructor, Array);
  assert.equal(expected.constructor, Array);
  assert.deepEqual(kernel(), expected);
  gpu.destroy();
}

(GPU.isSinglePrecisionSupported ? test : skip)('Array2D(4) (GPU only) auto', () => {
  testArray2D4();
});

(GPU.isSinglePrecisionSupported ? test : skip)('Array1D(4) (GPU only) gpu', () => {
  testArray2D4('gpu');
});

(GPU.isSinglePrecisionSupported && GPU.isWebGLSupported ? test : skip)('Array2D(4) (GPU only) webgl', () => {
  testArray2D4('webgl');
});

(GPU.isSinglePrecisionSupported && GPU.isWebGL2Supported ? test : skip)('Array2D(4) (GPU only) webgl2', () => {
  testArray2D4('webgl2');
});

(GPU.isSinglePrecisionSupported && GPU.isHeadlessGLSupported ? test : skip)('Array2D(4) (GPU only) headlessgl', () => {
  testArray2D4('headlessgl');
});

function testArray3D2(mode) {
  const gpu = new GPU({ mode });
  const texture = (
    gpu.createKernel(function() { return [this.thread.x, this.thread.x * this.thread.y * this.thread.z]; })
      .setOutput([10, 10, 10])
      .setPipeline(true)
      .setPrecision('single')
  )();
  const expected = texture.toArray();
  const kernel = gpu.createKernel(function() {
    return this.constants.value[this.thread.z][this.thread.y][this.thread.x];
  })
    .setConstants({
      value: texture
    })
    .setConstantTypes({
      value: 'Array1D(2)'
    })
    .setOutput([10, 10, 10])
    .setPipeline(false)
    .setPrecision('single');

  assert.notEqual(texture.constructor, Array);
  assert.equal(expected.constructor, Array);
  assert.deepEqual(kernel(), expected);
  gpu.destroy();
}

(GPU.isSinglePrecisionSupported ? test : skip)('Array3D(2) (GPU only) auto', () => {
  testArray3D2();
});

(GPU.isSinglePrecisionSupported ? test : skip)('Array3D(2) (GPU only) gpu', () => {
  testArray3D2('gpu');
});

(GPU.isSinglePrecisionSupported && GPU.isWebGLSupported ? test : skip)('Array3D(2) (GPU only) webgl', () => {
  testArray3D2('webgl');
});

(GPU.isSinglePrecisionSupported && GPU.isWebGL2Supported ? test : skip)('Array3D(2) (GPU only) webgl2', () => {
  testArray3D2('webgl2');
});

(GPU.isSinglePrecisionSupported && GPU.isHeadlessGLSupported ? test : skip)('Array3D(2) (GPU only) headlessgl', () => {
  testArray3D2('headlessgl');
});

function testArray3D3(mode) {
  const gpu = new GPU({ mode });
  const texture = (
    gpu.createKernel(function() { return [this.thread.x, this.thread.y, this.thread.z]; })
      .setOutput([10, 10, 10])
      .setPipeline(true)
      .setPrecision('single')
  )();
  const expected = texture.toArray();
  const kernel = gpu.createKernel(function() {
    return this.constants.value[this.thread.z][this.thread.y][this.thread.x];
  })
    .setConstants({
      value: texture
    })
    .setConstantTypes({
      value: 'Array1D(2)'
    })
    .setOutput([10, 10, 10])
    .setPipeline(false)
    .setPrecision('single');

  assert.notEqual(texture.constructor, Array);
  assert.equal(expected.constructor, Array);
  assert.deepEqual(kernel(), expected);
  gpu.destroy();
}

(GPU.isSinglePrecisionSupported ? test : skip)('Array3D(3) (GPU only) auto', () => {
  testArray3D3();
});

(GPU.isSinglePrecisionSupported ? test : skip)('Array3D(3) (GPU only) gpu', () => {
  testArray3D3('gpu');
});

(GPU.isSinglePrecisionSupported && GPU.isWebGLSupported ? test : skip)('Array3D(3) (GPU only) webgl', () => {
  testArray3D3('webgl');
});

(GPU.isSinglePrecisionSupported && GPU.isWebGL2Supported ? test : skip)('Array3D(3) (GPU only) webgl2', () => {
  testArray3D3('webgl2');
});

(GPU.isSinglePrecisionSupported && GPU.isHeadlessGLSupported ? test : skip)('Array3D(3) (GPU only) headlessgl', () => {
  testArray3D3('headlessgl');
});

function testArray3D4(mode) {
  const gpu = new GPU({ mode });
  const texture = (
    gpu.createKernel(function() {
      return [
        this.thread.x,
        this.thread.y,
        this.thread.z,
        this.thread.x * this.thread.y * this.thread.z
      ];
    })
      .setOutput([10, 10, 10])
      .setPipeline(true)
      .setPrecision('single')
  )();
  const expected = texture.toArray();
  const kernel = gpu.createKernel(function() {
    return this.constants.value[this.thread.z][this.thread.y][this.thread.x];
  })
    .setConstants({
      value: texture
    })
    .setConstantTypes({
      value: 'Array1D(2)'
    })
    .setOutput([10, 10, 10])
    .setPipeline(false)
    .setPrecision('single');

  assert.notEqual(texture.constructor, Array);
  assert.equal(expected.constructor, Array);
  assert.deepEqual(kernel(), expected);
  gpu.destroy();
}

(GPU.isSinglePrecisionSupported ? test : skip)('Array3D(4) (GPU only) auto', () => {
  testArray3D4();
});

(GPU.isSinglePrecisionSupported ? test : skip)('Array3D(4) (GPU only) gpu', () => {
  testArray3D4('gpu');
});

(GPU.isSinglePrecisionSupported && GPU.isWebGLSupported ? test : skip)('Array3D(4) (GPU only) webgl', () => {
  testArray3D4('webgl');
});

(GPU.isSinglePrecisionSupported && GPU.isWebGL2Supported ? test : skip)('Array3D(4) (GPU only) webgl2', () => {
  testArray3D4('webgl2');
});

(GPU.isSinglePrecisionSupported && GPU.isHeadlessGLSupported ? test : skip)('Array3D(4) (GPU only) headlessgl', () => {
  testArray3D4('headlessgl');
});
