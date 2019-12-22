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

function testTextureDelete(mode, done) {
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function() {
    return this.thread.x;
  }, {
    output: [1],
    pipeline: true
  });
  const result = kernel();
  assert.equal(result.texture.refs, 2);
  const clone1 = result.clone();
  assert.equal(result.texture.refs, 3);
  const clone2 = result.clone();
  assert.equal(result.texture.refs, 4);
  const clone3 = result.clone();
  assert.equal(result.texture.refs, 5);
  const clone4 = result.clone();
  assert.equal(result.texture.refs, 6);
  const clone5 = result.clone();
  assert.equal(result.texture.refs, 7);

  clone1.delete();
  assert.equal(result.texture.refs, 6);
  clone2.delete();
  assert.equal(result.texture.refs, 5);
  clone3.delete();
  assert.equal(result.texture.refs, 4);
  clone4.delete();
  assert.equal(result.texture.refs, 3);
  clone5.delete();
  assert.equal(result.texture.refs, 2);
  result.delete();
  assert.equal(result.texture.refs, 1);
  gpu.destroy();
  const spy = sinon.spy(kernel.kernel.context, 'deleteTexture');
  setTimeout(() => {
    assert.equal(result.texture.refs, 0);
    assert.equal(spy.callCount, 1);
    assert.ok(spy.calledWith(result.texture));
    done();
  }, 2);
}

test('texture delete auto', t => {
  testTextureDelete(null, t.async());
});

test('texture delete gpu', t => {
  testTextureDelete('gpu', t.async());
});

(GPU.isWebGLSupported ? test : skip)('texture delete webgl', t => {
  testTextureDelete('webgl', t.async());
});

(GPU.isWebGL2Supported ? test : skip)('texture delete webgl2', t => {
  testTextureDelete('webgl2', t.async());
});

(GPU.isHeadlessGLSupported ? test : skip)('texture delete headlessgl', t => {
  testTextureDelete('headlessgl', t.async());
});