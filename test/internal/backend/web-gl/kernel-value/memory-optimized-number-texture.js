const { assert, skip, test, module: describe, only } = require('qunit');
const { webGLKernelValueMaps } = require('../../../../../src');

describe('internal: WebGLKernelValueMemoryOptimizedNumberTexture');

test('.constructor() checks too large height', () => {
  const mockKernel = {
    constructor: {
      features: { maxTextureSize: 1 },
    },
    validate: true,
  };
  assert.throws(() => {
    new webGLKernelValueMaps.unsigned.static.MemoryOptimizedNumberTexture({ size: [1, 2] }, {
      kernel: mockKernel,
      name: 'test',
      type: 'MemoryOptimizedNumberTexture',
      origin: 'user',
      tactic: 'speed',
      onRequestContextHandle: () => 1,
      onRequestTexture: () => null,
      onRequestIndex: () => 1
    });
  }, new Error('Argument texture height of 2 larger than maximum size of 1 for your GPU'));
});

test('.constructor() checks too large width', () => {
  const mockKernel = {
    constructor: {
      features: { maxTextureSize: 1 },
    },
    validate: true,
  };

  assert.throws(() => {
    new webGLKernelValueMaps.unsigned.static.MemoryOptimizedNumberTexture({ size: [2, 1] }, {
      kernel: mockKernel,
      name: 'test',
      type: 'MemoryOptimizedNumberTexture',
      origin: 'user',
      tactic: 'speed',
      onRequestContextHandle: () => 1,
      onRequestTexture: () => null,
      onRequestIndex: () => 1
    });
  }, new Error('Argument texture width of 2 larger than maximum size of 1 for your GPU'));
});

test('.constructor() checks ok height & width', () => {
  const mockKernel = {
    constructor: {
      features: { maxTextureSize: 2 },
    },
    validate: true,
    setUniform3iv: () => {},
    setUniform2iv: () => {},
    setUniform1i: () => {},
  };
  const mockContext = {
    activeTexture: () => {},
    bindTexture: () => {},
    texParameteri: () => {},
    pixelStorei: () => {},
    texImage2D: () => {},
  };
  const v = new webGLKernelValueMaps.unsigned.static.MemoryOptimizedNumberTexture({ size: [2,2], context: mockContext }, {
    kernel: mockKernel,
    name: 'test',
    type: 'MemoryOptimizedNumberTexture',
    origin: 'user',
    tactic: 'speed',
    context: mockContext,
    onRequestContextHandle: () => 1,
    onRequestTexture: () => null,
    onRequestIndex: () => 1
  });
  assert.equal(v.constructor.name, 'WebGLKernelValueMemoryOptimizedNumberTexture');
});

test('.updateValue() should set uploadValue when a pipeline kernel has no texture', () => {
  const mockKernel = {
    constructor: {
      features: { maxTextureSize: 2 },
    },
    validate: true,
    pipeline: true,
    setUniform3iv: () => {},
    setUniform2iv: () => {},
    setUniform1i: () => {},
  };
  const mockContext = {
    activeTexture: () => {},
    bindTexture: () => {},
    texParameteri: () => {},
    pixelStorei: () => {},
    texImage2D: () => {},
  };
  const v = new webGLKernelValueMaps.unsigned.static.MemoryOptimizedNumberTexture({ size: [2,2], context: mockContext }, {
    kernel: mockKernel,
    name: 'test',
    type: 'MemoryOptimizedNumberTexture',
    origin: 'user',
    tactic: 'speed',
    context: mockContext,
    onRequestContextHandle: () => 1,
    onRequestTexture: () => null,
    onRequestIndex: () => 1
  });

  const newMockTexture = {}
  v.updateValue({ size: [2,2], context: mockContext, texture: newMockTexture })
  assert.equal(v.uploadValue, newMockTexture)
});
