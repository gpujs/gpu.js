const sinon = require('sinon');
const { assert, skip, test, module: describe, only } = require('qunit');
const { GPU } = require('../../src');

describe('internal: texture recycling');

function testKernelTextureRecycling(precision, mode) {
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function(v) {
    return v[0] + 1;
  }, {
    output: [1],
    pipeline: true,
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

test('single precision kernel auto', () => {
  testKernelTextureRecycling('single')
});

test('single precision kernel gpu', () => {
  testKernelTextureRecycling('single', 'gpu');
});

(GPU.isWebGLSupported ? test : skip)('single precision kernel webgl', () => {
  testKernelTextureRecycling('single', 'webgl');
});

(GPU.isWebGL2Supported ? test : skip)('single precision kernel webgl2', () => {
  testKernelTextureRecycling('single', 'webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('kernel precision headlessgl', () => {
  testKernelTextureRecycling('single', 'headlessgl');
});

test('unsigned precision kernel auto', () => {
  testKernelTextureRecycling('unsigned')
});

test('unsigned precision kernel gpu', () => {
  testKernelTextureRecycling('unsigned', 'gpu');
});

(GPU.isWebGLSupported ? test : skip)('unsigned precision kernel webgl', () => {
  testKernelTextureRecycling('unsigned', 'webgl');
});

(GPU.isWebGL2Supported ? test : skip)('unsigned precision kernel webgl2', () => {
  testKernelTextureRecycling('unsigned', 'webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('unsigned precision headlessgl', () => {
  testKernelTextureRecycling('unsigned', 'headlessgl');
});

function testMappedKernelTextureRecycling(precision, mode) {
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

test('single precision mapped kernel auto', () => {
  testMappedKernelTextureRecycling('single')
});

test('single precision mapped kernel gpu', () => {
  testMappedKernelTextureRecycling('single', 'gpu');
});

(GPU.isWebGLSupported ? test : skip)('single precision mapped kernel webgl', () => {
  testMappedKernelTextureRecycling('single', 'webgl');
});

(GPU.isWebGL2Supported ? test : skip)('single precision mapped kernel webgl2', () => {
  testMappedKernelTextureRecycling('single', 'webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('single precision mapped kernel headlessgl', () => {
  testMappedKernelTextureRecycling('single', 'headlessgl');
});

test('unsigned precision mapped kernel auto', () => {
  testMappedKernelTextureRecycling('unsigned')
});

test('unsigned precision mapped kernel gpu', () => {
  testMappedKernelTextureRecycling('unsigned', 'gpu');
});

(GPU.isWebGLSupported ? test : skip)('unsigned precision mapped kernel webgl', () => {
  testMappedKernelTextureRecycling('unsigned', 'webgl');
});

(GPU.isWebGL2Supported ? test : skip)('unsigned precision mapped kernel webgl2', () => {
  testMappedKernelTextureRecycling('unsigned', 'webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('unsigned precision mapped kernel headlessgl', () => {
  testMappedKernelTextureRecycling('unsigned', 'headlessgl');
});

function testTextureDelete(precision, done, mode) {
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function() {
    return this.thread.x;
  }, {
    output: [1],
    pipeline: true,
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

test('single precision texture delete auto', t => {
  testTextureDelete('single', t.async());
});

test('single precision texture delete gpu', t => {
  testTextureDelete('single', t.async(), 'gpu');
});

(GPU.isWebGLSupported ? test : skip)('single precision texture delete webgl', t => {
  testTextureDelete('single', t.async(), 'webgl');
});

(GPU.isWebGL2Supported ? test : skip)('single precision texture delete webgl2', t => {
  testTextureDelete('single', t.async(), 'webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('single precision texture delete headlessgl', t => {
  testTextureDelete('single', t.async(), 'headlessgl');
});

test('unsigned precision texture delete auto', t => {
  testTextureDelete('unsigned', t.async() );
});

test('unsigned precision texture delete gpu', t => {
  testTextureDelete('unsigned', t.async(), 'gpu');
});

(GPU.isWebGLSupported ? test : skip)('unsigned precision texture delete webgl', t => {
  testTextureDelete('unsigned', t.async(), 'webgl');
});

(GPU.isWebGL2Supported ? test : skip)('unsigned precision texture delete webgl2', t => {
  testTextureDelete('unsigned', t.async(), 'webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('unsigned precision texture delete headlessgl', t => {
  testTextureDelete('unsigned', t.async(), 'headlessgl');
});

function testKernelTextureDoesNotLeak(precision, done, mode) {
  const gpu = new GPU({ mode });
  const toTexture = gpu.createKernel(function(value) {
    return value[this.thread.x];
  }, {
    output: [1],
    pipeline: true,
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

test('unsigned precision kernel.texture does not leak auto', t => {
  testKernelTextureDoesNotLeak('unsigned', t.async());
});

test('unsigned precision kernel.texture does not leak gpu', t => {
  testKernelTextureDoesNotLeak('unsigned', t.async(), 'gpu');
});

(GPU.isWebGLSupported ? test : skip)('unsigned precision kernel.texture does not leak webgl', t => {
  testKernelTextureDoesNotLeak('unsigned', t.async(), 'webgl');
});

(GPU.isWebGL2Supported ? test : skip)('unsigned precision kernel.texture does not leak webgl2', t => {
  testKernelTextureDoesNotLeak('unsigned', t.async(), 'webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('unsigned precision kernel.texture does not leak headlessgl', t => {
  testKernelTextureDoesNotLeak('unsigned', t.async(), 'headlessgl');
});

test('single precision kernel.texture does not leak auto', t => {
  testKernelTextureDoesNotLeak('single', t.async());
});

test('single precision kernel.texture does not leak gpu', t => {
  testKernelTextureDoesNotLeak('single', t.async(), 'gpu');
});

(GPU.isWebGLSupported ? test : skip)('single precision kernel.texture does not leak webgl', t => {
  testKernelTextureDoesNotLeak('single', t.async(), 'webgl');
});

(GPU.isWebGL2Supported ? test : skip)('single precision kernel.texture does not leak webgl2', t => {
  testKernelTextureDoesNotLeak('single', t.async(), 'webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('single precision kernel.texture does not leak headlessgl', t => {
  testKernelTextureDoesNotLeak('single', t.async(), 'headlessgl');
});

function testKernelMappedTexturesDoesNotLeak(precision, done, mode) {
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

test('unsigned precision kernel.mappedTextures does not leak auto', t => {
  testKernelMappedTexturesDoesNotLeak('unsigned', t.async());
});

test('unsigned precision kernel.mappedTextures does not leak gpu', t => {
  testKernelMappedTexturesDoesNotLeak('unsigned', t.async(), 'gpu');
});

(GPU.isWebGLSupported ? test : skip)('unsigned precision kernel.mappedTextures does not leak webgl', t => {
  testKernelMappedTexturesDoesNotLeak('unsigned', t.async(), 'webgl');
});

(GPU.isWebGL2Supported ? test : skip)('unsigned precision kernel.mappedTextures does not leak webgl2', t => {
  testKernelMappedTexturesDoesNotLeak('unsigned', t.async(), 'webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('unsigned precision kernel.mappedTextures does not leak headlessgl', t => {
  testKernelMappedTexturesDoesNotLeak('unsigned', t.async(), 'headlessgl');
});

test('single precision kernel.mappedTextures does not leak auto', t => {
  testKernelMappedTexturesDoesNotLeak('single', t.async());
});

test('single precision kernel.mappedTextures does not leak gpu', t => {
  testKernelMappedTexturesDoesNotLeak('single', t.async(), 'gpu');
});

(GPU.isWebGLSupported ? test : skip)('single precision kernel.mappedTextures does not leak webgl', t => {
  testKernelMappedTexturesDoesNotLeak('single', t.async(), 'webgl');
});

(GPU.isWebGL2Supported ? test : skip)('single precision kernel.mappedTextures does not leak webgl2', t => {
  testKernelMappedTexturesDoesNotLeak('single', t.async(), 'webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('single precision kernel.mappedTextures does not leak headlessgl', t => {
  testKernelMappedTexturesDoesNotLeak('single', t.async(), 'headlessgl');
});