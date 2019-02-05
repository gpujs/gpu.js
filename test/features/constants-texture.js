const { assert, skip, test, module: describe, only } = require('qunit');
const { GPU } = require('../../src');

describe('features: constants texture 1d');
function test1D(mode) {
  const gpu = new GPU({ mode });
  const createTexture = gpu
    .createKernel(function() {
      return 200;
    })
    .setOutput([2])
    .setPipeline(true);
  const texture = createTexture();
  const tryConst = gpu.createKernel(
    function() {
      return this.constants.texture[this.thread.x];
    },
    {
      constants: { texture }
    }
  ).setOutput([2]);
  const result = tryConst();
  const expected = new Float32Array([200, 200]);
  assert.deepEqual(result, expected, 'texture constant passed test');
  gpu.destroy();
}

test('auto', () => {
  test1D(null);
});

test('gpu', () => {
  test1D('gpu');
});

(GPU.isWebGLSupported ? test : skip)('webgl', function () {
  test1D('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('webgl2', function () {
  test1D('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('headlessgl', function () {
  test1D('headlessgl');
});

test('cpu', () => {
  test1D('cpu');
});



describe('features: constants texture 2d');
function test2D(mode) {
  const gpu = new GPU({ mode });
  const createTexture = gpu
    .createKernel(function() {
      return 200;
    })
    .setOutput([2, 2])
    .setPipeline(true);
  const texture = createTexture();
  const tryConst = gpu.createKernel(
    function() {
      return this.constants.texture[this.thread.y][this.thread.x];
    },
    {
      constants: { texture }
    }
  ).setOutput([2, 2]);
  const result = tryConst();
  const expected = [new Float32Array([200, 200]), new Float32Array([200, 200])];
  assert.deepEqual(result, expected, 'texture constant passed test');
  gpu.destroy();
}

test('auto', () => {
  test2D(null);
});

test('gpu', () => {
  test2D('gpu');
});

(GPU.isWebGLSupported ? test : skip)('webgl', function () {
  test2D('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('webgl2', function () {
  test2D('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('headlessgl', function () {
  test2D('headlessgl');
});

test('cpu', () => {
  test2D('cpu');
});


describe('features: constants texture 3d');
function test3D(mode) {
  const gpu = new GPU({ mode });
  const createTexture = gpu
    .createKernel(function() {
      return 200;
    })
    .setOutput([2, 2, 2])
    .setPipeline(true);
  const texture = createTexture();
  const tryConst = gpu.createKernel(
    function() {
      return this.constants.texture[this.thread.z][this.thread.y][this.thread.x];
    },
    {
      constants: { texture }
    }
  ).setOutput([2, 2, 2]);
  const result = tryConst();
  const expected = [[new Float32Array([200, 200]), new Float32Array([200, 200])],[new Float32Array([200, 200]), new Float32Array([200, 200])]];
  assert.deepEqual(result, expected, 'texture constant passed test');
  gpu.destroy();
}

test('auto', () => {
  test3D(null);
});

test('gpu', () => {
  test3D('cpu');
});

(GPU.isWebGLSupported ? test : skip)('webgl', function () {
  test3D('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('webgl2', function () {
  test3D('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('headlessgl', function () {
  test3D('headlessgl');
});

test('cpu', () => {
  test3D('cpu');
});
