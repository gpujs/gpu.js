const sinon = require('sinon');
const { assert, skip, test, module: describe, only } = require('qunit');
const { GPU } = require('../../src');

describe('internal: texture recycling');

function testImmutableKernelTextureRecycling(precision, mode) {
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function(v) {
    return v[0] + 1;
  }, {
    output: [1],
    pipeline: true,
    immutable: true,
    precision,
  });
  let result = kernel([0]);
  const cloneTextureSpy = sinon.spy(kernel.texture.constructor.prototype, 'cloneTexture');
  for (let i = 0; i < 10; i++) {
    let lastResult = result;
    result = kernel(result);
    lastResult.delete();
  }
  assert.deepEqual(result.toArray(), new Float32Array([11]));
  assert.equal(cloneTextureSpy.callCount, 1);
  cloneTextureSpy.restore();
  gpu.destroy();
}

test('immutable single precision kernel auto', () => {
  testImmutableKernelTextureRecycling('single')
});

test('immutable single precision kernel gpu', () => {
  testImmutableKernelTextureRecycling('single', 'gpu');
});

(GPU.isWebGLSupported ? test : skip)('immutable single precision kernel webgl', () => {
  testImmutableKernelTextureRecycling('single', 'webgl');
});

(GPU.isWebGL2Supported ? test : skip)('immutable single precision kernel webgl2', () => {
  testImmutableKernelTextureRecycling('single', 'webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('immutable single precision kernel headlessgl', () => {
  testImmutableKernelTextureRecycling('single', 'headlessgl');
});

test('immutable unsigned precision kernel auto', () => {
  testImmutableKernelTextureRecycling('unsigned')
});

test('immutable unsigned precision kernel gpu', () => {
  testImmutableKernelTextureRecycling('unsigned', 'gpu');
});

(GPU.isWebGLSupported ? test : skip)('immutable unsigned precision kernel webgl', () => {
  testImmutableKernelTextureRecycling('unsigned', 'webgl');
});

(GPU.isWebGL2Supported ? test : skip)('immutable unsigned precision kernel webgl2', () => {
  testImmutableKernelTextureRecycling('unsigned', 'webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('immutable unsigned precision headlessgl', () => {
  testImmutableKernelTextureRecycling('unsigned', 'headlessgl');
});

function testImmutableMappedKernelTextureRecycling(precision, mode) {
  const gpu = new GPU({ mode });
  function oneOff(value) {
    return value;
  }
  const kernel = gpu.createKernelMap({
    oneOffValue: oneOff
  },function(value1, value2) {
    oneOff(value2[0] - 1);
    return value1[0] + 1;
  }, {
    output: [1],
    pipeline: true,
    immutable: true,
    precision,
  });
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
  assert.equal(cloneTextureSpy.callCount, 2);
  cloneTextureSpy.restore();
  gpu.destroy();
}

test('immutable single precision mapped kernel auto', () => {
  testImmutableMappedKernelTextureRecycling('single')
});

test('immutable single precision mapped kernel gpu', () => {
  testImmutableMappedKernelTextureRecycling('single', 'gpu');
});

(GPU.isWebGLSupported ? test : skip)('immutable single precision mapped kernel webgl', () => {
  testImmutableMappedKernelTextureRecycling('single', 'webgl');
});

(GPU.isWebGL2Supported ? test : skip)('immutable single precision mapped kernel webgl2', () => {
  testImmutableMappedKernelTextureRecycling('single', 'webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('immutable single precision mapped kernel headlessgl', () => {
  testImmutableMappedKernelTextureRecycling('single', 'headlessgl');
});

test('immutable unsigned precision mapped kernel auto', () => {
  testImmutableMappedKernelTextureRecycling('unsigned')
});

test('immutable unsigned precision mapped kernel gpu', () => {
  testImmutableMappedKernelTextureRecycling('unsigned', 'gpu');
});

(GPU.isWebGLSupported ? test : skip)('immutable unsigned precision mapped kernel webgl', () => {
  testImmutableMappedKernelTextureRecycling('unsigned', 'webgl');
});

(GPU.isWebGL2Supported ? test : skip)('immutable unsigned precision mapped kernel webgl2', () => {
  testImmutableMappedKernelTextureRecycling('unsigned', 'webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('immutable unsigned precision mapped kernel headlessgl', () => {
  testImmutableMappedKernelTextureRecycling('unsigned', 'headlessgl');
});

function testImmutableTextureDelete(precision, done, mode) {
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function() {
    return this.thread.x;
  }, {
    output: [1],
    pipeline: true,
    immutable: true,
    precision,
  });
  const result = kernel();
  assert.equal(result.texture._refs, 2);
  const clone1 = result.clone();
  assert.equal(result.texture._refs, 3);
  const clone2 = result.clone();
  assert.equal(result.texture._refs, 4);
  const clone3 = result.clone();
  assert.equal(result.texture._refs, 5);
  const clone4 = result.clone();
  assert.equal(result.texture._refs, 6);
  const clone5 = result.clone();
  assert.equal(result.texture._refs, 7);

  clone1.delete();
  assert.equal(result.texture._refs, 6);
  clone2.delete();
  assert.equal(result.texture._refs, 5);
  clone3.delete();
  assert.equal(result.texture._refs, 4);
  clone4.delete();
  assert.equal(result.texture._refs, 3);
  clone5.delete();
  assert.equal(result.texture._refs, 2);
  result.delete();
  assert.equal(result.texture._refs, 1);
  const spy = sinon.spy(kernel.kernel.context, 'deleteTexture');
  gpu.destroy()
    .then(() => {
      assert.equal(result.texture._refs, 0);
      assert.equal(spy.callCount, 1);
      assert.ok(spy.calledWith(result.texture));
      spy.restore();
      done();
    });
}

test('immutable single precision texture delete auto', t => {
  testImmutableTextureDelete('single', t.async());
});

test('immutable single precision texture delete gpu', t => {
  testImmutableTextureDelete('single', t.async(), 'gpu');
});

(GPU.isWebGLSupported ? test : skip)('immutable single precision texture delete webgl', t => {
  testImmutableTextureDelete('single', t.async(), 'webgl');
});

(GPU.isWebGL2Supported ? test : skip)('immutable single precision texture delete webgl2', t => {
  testImmutableTextureDelete('single', t.async(), 'webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('immutable single precision texture delete headlessgl', t => {
  testImmutableTextureDelete('single', t.async(), 'headlessgl');
});

test('immutable unsigned precision texture delete auto', t => {
  testImmutableTextureDelete('unsigned', t.async() );
});

test('immutable unsigned precision texture delete gpu', t => {
  testImmutableTextureDelete('unsigned', t.async(), 'gpu');
});

(GPU.isWebGLSupported ? test : skip)('immutable unsigned precision texture delete webgl', t => {
  testImmutableTextureDelete('unsigned', t.async(), 'webgl');
});

(GPU.isWebGL2Supported ? test : skip)('immutable unsigned precision texture delete webgl2', t => {
  testImmutableTextureDelete('unsigned', t.async(), 'webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('immutable unsigned precision texture delete headlessgl', t => {
  testImmutableTextureDelete('unsigned', t.async(), 'headlessgl');
});

function testImmutableKernelTextureDoesNotLeak(precision, done, mode) {
  const gpu = new GPU({ mode });
  const toTexture = gpu.createKernel(function(value) {
    return value[this.thread.x];
  }, {
    output: [1],
    pipeline: true,
    immutable: true,
    precision,
  });
  const one = toTexture([1]);
  assert.equal(one.texture._refs, 2); // one's texture will be used in two places at first, in one and toTexture.texture
  assert.equal(toTexture.texture.texture, one.texture); // very important, a clone was mode, but not a deep clone
  assert.notEqual(one, toTexture.texture);
  const two = toTexture([2]);
  assert.equal(one.texture._refs, 1); // was tracked on toTexture.texture, and deleted
  assert.equal(toTexture.texture.texture, two.texture);
  assert.notEqual(toTexture.texture.texture, one.texture);
  assert.equal(two.texture._refs, 2);
  one.delete();
  two.delete();
  assert.equal(one.texture._refs, 0);
  assert.equal(two.texture._refs, 1); // still used by toTexture.texture
  two.delete(); // already deleted
  assert.equal(two.texture._refs, 1); // still used by toTexture
  gpu.destroy()
    .then(() => {
      assert.equal(two.texture._refs, 0);
      done();
    });
}

test('immutable unsigned precision kernel.texture does not leak auto', t => {
  testImmutableKernelTextureDoesNotLeak('unsigned', t.async());
});

test('immutable unsigned precision kernel.texture does not leak gpu', t => {
  testImmutableKernelTextureDoesNotLeak('unsigned', t.async(), 'gpu');
});

(GPU.isWebGLSupported ? test : skip)('immutable unsigned precision kernel.texture does not leak webgl', t => {
  testImmutableKernelTextureDoesNotLeak('unsigned', t.async(), 'webgl');
});

(GPU.isWebGL2Supported ? test : skip)('immutable unsigned precision kernel.texture does not leak webgl2', t => {
  testImmutableKernelTextureDoesNotLeak('unsigned', t.async(), 'webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('immutable unsigned precision kernel.texture does not leak headlessgl', t => {
  testImmutableKernelTextureDoesNotLeak('unsigned', t.async(), 'headlessgl');
});

test('immutable single precision kernel.texture does not leak auto', t => {
  testImmutableKernelTextureDoesNotLeak('single', t.async());
});

test('immutable single precision kernel.texture does not leak gpu', t => {
  testImmutableKernelTextureDoesNotLeak('single', t.async(), 'gpu');
});

(GPU.isWebGLSupported ? test : skip)('immutable single precision kernel.texture does not leak webgl', t => {
  testImmutableKernelTextureDoesNotLeak('single', t.async(), 'webgl');
});

(GPU.isWebGL2Supported ? test : skip)('immutable single precision kernel.texture does not leak webgl2', t => {
  testImmutableKernelTextureDoesNotLeak('single', t.async(), 'webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('immutable single precision kernel.texture does not leak headlessgl', t => {
  testImmutableKernelTextureDoesNotLeak('single', t.async(), 'headlessgl');
});

function testImmutableKernelMappedTexturesDoesNotLeak(precision, done, mode) {
  const gpu = new GPU({ mode });
  function saveValue(value) {
    return value;
  }
  const toTextures = gpu.createKernelMap([saveValue],function(value1, value2) {
    saveValue(value1[this.thread.x]);
    return value2[this.thread.x];
  }, {
    output: [1],
    pipeline: true,
    immutable: true,
    precision,
  });
  const { result: one, 0: two } = toTextures([1], [2]);
  assert.equal(one.texture._refs, 2); // one's texture will be used in two places at first, in one and toTexture.texture
  assert.equal(two.texture._refs, 2); // one's texture will be used in two places at first, in one and toTexture.mappedTextures[0]
  assert.equal(toTextures.texture.texture, one.texture); // very important, a clone was mode, but not a deep clone
  assert.equal(toTextures.mappedTextures[0].texture, two.texture); // very important, a clone was mode, but not a deep clone
  assert.notEqual(one, toTextures.texture);
  assert.notEqual(one, toTextures.mappedTextures[0]);
  const { result: three, 0: four } = toTextures([3], [4]);
  assert.equal(one.texture._refs, 1); // was tracked on toTexture.texture, and deleted
  assert.equal(two.texture._refs, 1); // was tracked on toTexture.mappedTextures[0], and deleted
  assert.equal(toTextures.texture.texture, three.texture);
  assert.equal(toTextures.mappedTextures[0].texture, four.texture);
  assert.notEqual(toTextures.texture.texture, one.texture);
  assert.notEqual(toTextures.mappedTextures[0].texture, two.texture);
  assert.equal(three.texture._refs, 2);
  assert.equal(four.texture._refs, 2);
  one.delete();
  two.delete();
  three.delete();
  four.delete();
  assert.equal(one.texture._refs, 0);
  assert.equal(two.texture._refs, 0);
  assert.equal(three.texture._refs, 1); // still used by toTexture.texture
  assert.equal(four.texture._refs, 1); // still used by toTexture.mappedTextures[0]
  three.delete(); // already deleted
  four.delete(); // already deleted
  assert.equal(three.texture._refs, 1); // still used by toTexture
  assert.equal(four.texture._refs, 1); // still used by toTexture
  gpu.destroy()
    .then(() => {
      assert.equal(one.texture._refs, 0);
      assert.equal(two.texture._refs, 0);
      assert.equal(three.texture._refs, 0);
      assert.equal(four.texture._refs, 0);
      done();
    });
}

test('immutable unsigned precision kernel.mappedTextures does not leak auto', t => {
  testImmutableKernelMappedTexturesDoesNotLeak('unsigned', t.async());
});

test('immutable unsigned precision kernel.mappedTextures does not leak gpu', t => {
  testImmutableKernelMappedTexturesDoesNotLeak('unsigned', t.async(), 'gpu');
});

(GPU.isWebGLSupported ? test : skip)('immutable unsigned precision kernel.mappedTextures does not leak webgl', t => {
  testImmutableKernelMappedTexturesDoesNotLeak('unsigned', t.async(), 'webgl');
});

(GPU.isWebGL2Supported ? test : skip)('immutable unsigned precision kernel.mappedTextures does not leak webgl2', t => {
  testImmutableKernelMappedTexturesDoesNotLeak('unsigned', t.async(), 'webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('immutable unsigned precision kernel.mappedTextures does not leak headlessgl', t => {
  testImmutableKernelMappedTexturesDoesNotLeak('unsigned', t.async(), 'headlessgl');
});

test('immutable single precision kernel.mappedTextures does not leak auto', t => {
  testImmutableKernelMappedTexturesDoesNotLeak('single', t.async());
});

test('immutable single precision kernel.mappedTextures does not leak gpu', t => {
  testImmutableKernelMappedTexturesDoesNotLeak('single', t.async(), 'gpu');
});

(GPU.isWebGLSupported ? test : skip)('immutable single precision kernel.mappedTextures does not leak webgl', t => {
  testImmutableKernelMappedTexturesDoesNotLeak('single', t.async(), 'webgl');
});

(GPU.isWebGL2Supported ? test : skip)('immutable single precision kernel.mappedTextures does not leak webgl2', t => {
  testImmutableKernelMappedTexturesDoesNotLeak('single', t.async(), 'webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('immutable single precision kernel.mappedTextures does not leak headlessgl', t => {
  testImmutableKernelMappedTexturesDoesNotLeak('single', t.async(), 'headlessgl');
});

function testCloning(mode) {
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function(value) {
    return value[0] + 1;
  }, { output: [1], pipeline: true });
  const texture = kernel([1]);
  const { size } = texture;

  // set size to something unique, for tracking
  texture.size = [size[0] + 0.1, size[1] + 0.2];
  texture.cloneTexture();
  assert.equal(texture._framebuffer.width, size[0] + 0.1);
  assert.equal(texture._framebuffer.height, size[1] + 0.2);
  gpu.destroy();
}

(GPU.isWebGLSupported ? test : skip)('cloning sets up framebuffer with correct size webgl', () => {
  testCloning('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('cloning sets up framebuffer with correct size webgl2', () => {
  testCloning('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('cloning sets up framebuffer with correct size headlessgl', () => {
  testCloning('headlessgl');
});
