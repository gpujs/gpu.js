const sinon = require('sinon');
const { assert, skip, test, module: describe, only } = require('qunit');
const { GPU } = require('../../src');

describe('internal: recycling');

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
  const newTextureSpy = sinon.spy(kernel.texture.constructor.prototype, 'newTexture');
  for (let i = 0; i < 10; i++) {
    let lastResult = result;
    result = kernel(result);
    lastResult.delete();
  }
  assert.deepEqual(result.toArray(), new Float32Array([11]));
  assert.equal(newTextureSpy.callCount, 1);
  newTextureSpy.restore();
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
  const newTextureSpy = sinon.spy(kernel.texture.constructor.prototype, 'newTexture');
  for (let i = 0; i < 10; i++) {
    let lastResults = map;
    map = kernel(map.result, map.oneOffValue);
    lastResults.result.delete();
    lastResults.oneOffValue.delete();
  }
  assert.deepEqual(map.result.toArray(), new Float32Array([11]));
  assert.deepEqual(map.oneOffValue.toArray(), new Float32Array([0]));
  assert.equal(newTextureSpy.callCount, 2);
  newTextureSpy.restore();
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

function testMutableLeak(mode) {
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function() {
    return 1;
  }, {
    output: [1],
    pipeline: true
  });
  kernel.build();
  const cloneTextureSpy = sinon.spy(kernel.texture.constructor.prototype, 'beforeMutate');
  const texture1 = kernel();
  const texture2 = kernel();
  assert.equal(cloneTextureSpy.callCount, 0);
  assert.equal(texture1.texture._refs, 1);
  assert.ok(texture1 === texture2);
  cloneTextureSpy.restore();
  gpu.destroy();
}

test('test mutable leak auto', () => {
  testMutableLeak();
});

test('test mutable leak gpu', () => {
  testMutableLeak('gpu');
});

(GPU.isWebGLSupported ? test : skip)('test mutable leak webgl', () => {
  testMutableLeak('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('test mutable leak webgl2', () => {
  testMutableLeak('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('test mutable leak headlessgl', () => {
  testMutableLeak('headlessgl');
});

describe('internal: cpu recycling behaviour');

test('recycle CPU array', () => {
  const gpu = new GPU({ mode: 'cpu' });
  const kernel = gpu.createKernel(function(v) {
    return this.thread.x + v[0];
  }, {
    output: [1],
    pipeline: true,
    immutable: false,
  });
  const result1 = kernel(new Float32Array([1]));
  assert.equal(result1[0], 1);
  const result2 = kernel(new Float32Array([2]));

  assert.equal(result1[0], 2);
  assert.equal(result1, result2);
  gpu.destroy();
});

test('recycle CPU matrix', () => {
  const gpu = new GPU({ mode: 'cpu' });
  const kernel = gpu.createKernel(function(v) {
    return (this.thread.x + (this.thread.y * this.output.x)) + v[0];
  }, {
    output: [2, 2],
    pipeline: true,
    immutable: false,
  });
  const result1 = kernel(new Float32Array([1]));
  assert.equal(result1[0][0], 1);
  assert.equal(result1[0][1], 2);
  assert.equal(result1[1][0], 3);
  assert.equal(result1[1][1], 4);
  const result2 = kernel(new Float32Array([2]));
  assert.equal(result1[0][0], 2);
  assert.equal(result1[0][1], 3);
  assert.equal(result1[1][0], 4);
  assert.equal(result1[1][1], 5);

  assert.equal(result1, result2);
  gpu.destroy();
});

test('recycle CPU cube', () => {
  const gpu = new GPU({ mode: 'cpu' });
  const kernel = gpu.createKernel(function(v) {
    return (this.thread.x + (this.thread.y * this.output.x) + (this.thread.z * this.output.y * this.output.x)) + v[0];
  }, {
    output: [2, 2, 2],
    pipeline: true,
    immutable: false,
  });
  const result1 = kernel(new Float32Array([1]));
  assert.equal(result1[0][0][0], 1);
  assert.equal(result1[0][0][1], 2);
  assert.equal(result1[0][1][0], 3);
  assert.equal(result1[0][1][1], 4);
  assert.equal(result1[1][0][0], 5);
  assert.equal(result1[1][0][1], 6);
  assert.equal(result1[1][1][0], 7);
  assert.equal(result1[1][1][1], 8);
  const result2 = kernel(new Float32Array([2]));
  assert.equal(result1[0][0][0], 2);
  assert.equal(result1[0][0][1], 3);
  assert.equal(result1[0][1][0], 4);
  assert.equal(result1[0][1][1], 5);
  assert.equal(result1[1][0][0], 6);
  assert.equal(result1[1][0][1], 7);
  assert.equal(result1[1][1][0], 8);
  assert.equal(result1[1][1][1], 9);
  assert.equal(result1, result2);
  gpu.destroy();
});

describe('internal: cpu non-recycling behaviour');

test('non-recycle CPU array', () => {
  const gpu = new GPU({ mode: 'cpu' });
  const kernel = gpu.createKernel(function(v) {
    return this.thread.x + v[0];
  }, {
    output: [1],
    pipeline: true,
    immutable: true,
  });
  const result1 = kernel(new Float32Array([1]));
  assert.equal(result1[0], 1);
  const result2 = kernel(new Float32Array([2]));

  assert.equal(result1[0], 1);
  assert.equal(result2[0], 2);
  assert.notEqual(result1, result2);
  gpu.destroy();
});

test('non-recycle CPU matrix', () => {
  const gpu = new GPU({ mode: 'cpu' });
  const kernel = gpu.createKernel(function(v) {
    return (this.thread.x + (this.thread.y * this.output.x)) + v[0];
  }, {
    output: [2, 2],
    pipeline: true,
    immutable: true,
  });
  const result1 = kernel(new Float32Array([1]));
  assert.equal(result1[0][0], 1);
  assert.equal(result1[0][1], 2);
  assert.equal(result1[1][0], 3);
  assert.equal(result1[1][1], 4);
  const result2 = kernel(new Float32Array([2]));
  // untouched
  assert.equal(result1[0][0], 1);
  assert.equal(result1[0][1], 2);
  assert.equal(result1[1][0], 3);
  assert.equal(result1[1][1], 4);

  assert.equal(result2[0][0], 2);
  assert.equal(result2[0][1], 3);
  assert.equal(result2[1][0], 4);
  assert.equal(result2[1][1], 5);

  assert.notEqual(result1, result2);
  gpu.destroy();
});

test('non-recycle CPU cube', () => {
  const gpu = new GPU({ mode: 'cpu' });
  const kernel = gpu.createKernel(function(v) {
    return (this.thread.x + (this.thread.y * this.output.x) + (this.thread.z * this.output.y * this.output.x)) + v[0];
  }, {
    output: [2, 2, 2],
    pipeline: true,
    immutable: true,
  });
  const result1 = kernel(new Float32Array([1]));
  assert.equal(result1[0][0][0], 1);
  assert.equal(result1[0][0][1], 2);
  assert.equal(result1[0][1][0], 3);
  assert.equal(result1[0][1][1], 4);
  assert.equal(result1[1][0][0], 5);
  assert.equal(result1[1][0][1], 6);
  assert.equal(result1[1][1][0], 7);
  assert.equal(result1[1][1][1], 8);
  const result2 = kernel(new Float32Array([2]));
  // untouched
  assert.equal(result1[0][0][0], 1);
  assert.equal(result1[0][0][1], 2);
  assert.equal(result1[0][1][0], 3);
  assert.equal(result1[0][1][1], 4);
  assert.equal(result1[1][0][0], 5);
  assert.equal(result1[1][0][1], 6);
  assert.equal(result1[1][1][0], 7);
  assert.equal(result1[1][1][1], 8);

  assert.equal(result2[0][0][0], 2);
  assert.equal(result2[0][0][1], 3);
  assert.equal(result2[0][1][0], 4);
  assert.equal(result2[0][1][1], 5);
  assert.equal(result2[1][0][0], 6);
  assert.equal(result2[1][0][1], 7);
  assert.equal(result2[1][1][0], 8);
  assert.equal(result2[1][1][1], 9);
  assert.notEqual(result1, result2);
  gpu.destroy();
});

function testSameSourceDestinationFromResultThrows(error, precision, mode) {
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function(value) {
    return value[this.thread.x] + 1;
  }, {
    output: [1],
    pipeline: true,
    immutable: false,
    precision,
  });
  let result = kernel([0]);
  assert.equal((result.toArray ? result.toArray() : result)[0], 1);
  assert.throws(() => kernel(result), error);
  gpu.destroy();
}

const gpuError = new Error('Source and destination textures are the same.  Use immutable = true and manually cleanup kernel output texture memory with texture.delete()');
const cpuError = new Error('Source and destination arrays are the same.  Use immutable = true');

test('single precision same source and destination from result mutable throws auto', () => {
  testSameSourceDestinationFromResultThrows(gpuError,'single');
});

test('single precision same source and destination from result mutable throws gpu', () => {
  testSameSourceDestinationFromResultThrows(gpuError, 'single', 'gpu');
});

(GPU.isWebGLSupported ? test : skip)('single precision same source and destination from result mutable throws webgl', () => {
  testSameSourceDestinationFromResultThrows(gpuError, 'single', 'webgl');
});

(GPU.isWebGL2Supported ? test : skip)('single precision same source and destination from result mutable throws webgl2', () => {
  testSameSourceDestinationFromResultThrows(gpuError, 'single', 'webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('single precision same source and destination from result mutable throws headlessgl', () => {
  testSameSourceDestinationFromResultThrows(gpuError, 'single', 'headlessgl');
});

test('single precision same source and destination from result mutable throws cpu', () => {
  testSameSourceDestinationFromResultThrows(cpuError, 'single', 'cpu');
});

test('unsigned precision same source and destination from result mutable throws auto', () => {
  testSameSourceDestinationFromResultThrows(gpuError, 'unsigned');
});

test('unsigned precision same source and destination from result mutable throws gpu', () => {
  testSameSourceDestinationFromResultThrows(gpuError, 'unsigned', 'gpu');
});

(GPU.isWebGLSupported ? test : skip)('unsigned precision same source and destination from result mutable throws webgl', () => {
  testSameSourceDestinationFromResultThrows(gpuError, 'unsigned', 'webgl');
});

(GPU.isWebGL2Supported ? test : skip)('unsigned precision same source and destination from result mutable throws webgl2', () => {
  testSameSourceDestinationFromResultThrows(gpuError, 'unsigned', 'webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('unsigned precision same source and destination from result mutable throws headlessgl', () => {
  testSameSourceDestinationFromResultThrows(gpuError, 'unsigned', 'headlessgl');
});

test('unsigned precision same source and destination from result mutable throws cpu', () => {
  testSameSourceDestinationFromResultThrows(cpuError, 'unsigned', 'cpu');
});

function testSameSourceDestinationFromMappedResultThrows(error, precision, mode) {
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernelMap({
    mappedResult: function map(v) {
      return v;
    }
  }, function(value) {
    return map(value[this.thread.x] + 1);
  }, {
    output: [1],
    pipeline: true,
    immutable: false,
    precision,
  });
  let { result, mappedResult } = kernel([0]);
  assert.equal((mappedResult.toArray ? mappedResult.toArray() : mappedResult)[0], 1);
  assert.throws(() => kernel(mappedResult), error);
  assert.throws(() => kernel(result), error);
  gpu.destroy();
}

test('single precision same source and destination from mapped result mutable throws auto', () => {
  testSameSourceDestinationFromMappedResultThrows(gpuError, 'single');
});

test('single precision same source and destination from mapped result mutable throws gpu', () => {
  testSameSourceDestinationFromMappedResultThrows(gpuError, 'single', 'gpu');
});

(GPU.isWebGLSupported ? test : skip)('single precision same source and destination from mapped result mutable throws webgl', () => {
  testSameSourceDestinationFromMappedResultThrows(gpuError, 'single', 'webgl');
});

(GPU.isWebGL2Supported ? test : skip)('single precision same source and destination from mapped result mutable throws webgl2', () => {
  testSameSourceDestinationFromMappedResultThrows(gpuError, 'single', 'webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('single precision same source and destination from mapped result mutable throws headlessgl', () => {
  testSameSourceDestinationFromMappedResultThrows(gpuError, 'single', 'headlessgl');
});

test('single precision same source and destination from mapped result mutable throws cpu', () => {
  testSameSourceDestinationFromMappedResultThrows(cpuError, 'single', 'cpu');
});

test('unsigned precision same source and destination from mapped result mutable throws auto', () => {
  testSameSourceDestinationFromMappedResultThrows(gpuError, 'unsigned');
});

test('unsigned precision same source and destination from mapped result mutable throws gpu', () => {
  testSameSourceDestinationFromMappedResultThrows(gpuError, 'unsigned', 'gpu');
});

(GPU.isWebGLSupported ? test : skip)('unsigned precision same source and destination from mapped result mutable throws webgl', () => {
  testSameSourceDestinationFromMappedResultThrows(gpuError, 'unsigned', 'webgl');
});

(GPU.isWebGL2Supported ? test : skip)('unsigned precision same source and destination from mapped result mutable throws webgl2', () => {
  testSameSourceDestinationFromMappedResultThrows(gpuError, 'unsigned', 'webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('unsigned precision same source and destination from mapped result mutable throws headlessgl', () => {
  testSameSourceDestinationFromMappedResultThrows(gpuError, 'unsigned', 'headlessgl');
});

test('unsigned precision same source and destination from mapped result mutable throws cpu', () => {
  testSameSourceDestinationFromMappedResultThrows(cpuError, 'unsigned', 'cpu');
});