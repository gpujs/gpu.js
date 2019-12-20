const sinon = require('sinon');
const { assert, skip, test, module: describe, only } = require('qunit');
const { GPU } = require('../../src');

describe('internal: texture recycling');

function testKernelTextureRecycling(mode) {
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function(v) {
    return v[0] + 1;
  }, { output: [1], pipeline: true });
  let result = kernel([0]);
  const cloneTextureSpy = sinon.spy(kernel.texture.constructor.prototype, 'cloneTexture');
  for (let i = 0; i < 10; i++) {
    let lastResult = result;
    result = kernel(result);
    lastResult.delete();
  }
  assert.deepEqual(result.toArray(), new Float32Array([11]));
  assert.ok(cloneTextureSpy.calledOnce);
  cloneTextureSpy.restore();
  gpu.destroy();
}

test('kernel auto', () => {
  testKernelTextureRecycling()
});

test('kernel gpu', () => {
  testKernelTextureRecycling('gpu');
});

(GPU.isWebGLSupported ? test : skip)('kernel webgl', () => {
  testKernelTextureRecycling('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('kernel webgl2', () => {
  testKernelTextureRecycling('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('kernel headlessgl', () => {
  testKernelTextureRecycling('headlessgl');
});

function testMappedKernelTextureRecycling(mode) {
  const gpu = new GPU({ mode });
  function oneOff(value) {
    return value;
  }
  const kernel = gpu.createKernelMap({
    oneOffValue: oneOff
  },function(value1, value2) {
    oneOff(value2[0] - 1);
    return value1[0] + 1;
  }, { output: [1], pipeline: true });
  let map = kernel([0], [11]);
  const cloneTextureSpy = sinon.spy(kernel.texture.constructor.prototype, 'cloneTexture');
  for (let i = 0; i < 10; i++) {
    let lastResults = map;
    map = kernel(map.result, map.oneOffValue);
    lastResults.result.delete();
    lastResults.oneOffValue.delete();
  }
  assert.deepEqual(map.result.toArray(), new Float32Array([11]));
  assert.deepEqual(map.oneOffValue.toArray(), new Float32Array([0]));
  assert.ok(cloneTextureSpy.calledTwice);
  cloneTextureSpy.restore();
  gpu.destroy();
}

test('mapped kernel auto', () => {
  testMappedKernelTextureRecycling()
});

test('mapped kernel gpu', () => {
  testMappedKernelTextureRecycling('gpu');
});

(GPU.isWebGLSupported ? test : skip)('mapped kernel webgl', () => {
  testMappedKernelTextureRecycling('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('mapped kernel webgl2', () => {
  testMappedKernelTextureRecycling('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('mapped kernel headlessgl', () => {
  testMappedKernelTextureRecycling('headlessgl');
});