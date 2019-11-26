const { assert, skip, test, module: describe, only } = require('qunit');
const { webGLKernelValueMaps } = require('../../../../../src');

describe('internal: WebGLKernelValueDynamicNumberTexture');

test('.updateValue() checks too large height', () => {
  const mockKernel = {
    constructor: {
      features: { maxTextureSize: 1 },
    },
    validate: true,
  };
  const v = new webGLKernelValueMaps.unsigned.dynamic.NumberTexture({ size: [1, 1] }, {
    kernel: mockKernel,
    name: 'test',
    type: 'NumberTexture',
    origin: 'user',
    tactic: 'speed',
    onRequestContextHandle: () => 1,
    onRequestTexture: () => null,
    onRequestIndex: () => 1
  });

  assert.throws(() => {
    v.updateValue({ size: [1, 2] });
  }, new Error('Argument height of 2 larger than maximum size of 1 for your GPU'));
});

test('.updateValue() checks too large width', () => {
  const mockKernel = {
    constructor: {
      features: { maxTextureSize: 1 },
    },
    validate: true,
  };

  const v = new webGLKernelValueMaps.unsigned.dynamic.NumberTexture({ size: [1, 1] }, {
    kernel: mockKernel,
    name: 'test',
    type: 'NumberTexture',
    origin: 'user',
    tactic: 'speed',
    onRequestContextHandle: () => 1,
    onRequestTexture: () => null,
    onRequestIndex: () => 1
  });
  assert.throws(() => {
    v.updateValue({
      size: [2,1]
    })
  }, new Error('Argument width of 2 larger than maximum size of 1 for your GPU'));
});

test('.updateValue() checks ok height & width', () => {
  const mockKernel = {
    constructor: {
      features: { maxTextureSize: 2 },
    },
    validate: true,
    setUniform3iv: () => {},
    setUniform2iv: () => {},
    setUniform1i: () => {},
    outputTexture: {}
  };
  const mockContext = {
    activeTexture: () => {},
    bindTexture: () => {},
    texParameteri: () => {},
    pixelStorei: () => {},
    texImage2D: () => {},
  };
  const v = new webGLKernelValueMaps.unsigned.dynamic.NumberTexture({ size: [2,2], context: mockContext }, {
    kernel: mockKernel,
    name: 'test',
    type: 'NumberTexture',
    origin: 'user',
    tactic: 'speed',
    context: mockContext,
    onRequestContextHandle: () => 1,
    onRequestTexture: () => null,
    onRequestIndex: () => 1
  });
  v.updateValue({
    size: [1,1],
    context: mockContext,
    texture: {}
  });

  assert.equal(v.constructor.name, 'WebGLKernelValueDynamicNumberTexture');
});
