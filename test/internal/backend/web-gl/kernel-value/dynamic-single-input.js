const { assert, skip, test, module: describe, only } = require('qunit');
const { webGLKernelValueMaps } = require('../../../../../src');

describe('internal: WebGLKernelValueDynamicSingleInput');

test('.updateValue() checks too large height', () => {
  const mockKernel = {
    constructor: {
      features: { maxTextureSize: 4 },
    },
    validate: true,
  };
  const v = new webGLKernelValueMaps.single.dynamic.Input({ size: [1, 1], value: [0] }, {
    kernel: mockKernel,
    name: 'test',
    type: 'Input',
    origin: 'user',
    tactic: 'speed',
    onRequestContextHandle: () => 1,
    onRequestTexture: () => null,
    onRequestIndex: () => 1
  });

  assert.throws(() => {
    v.updateValue({ size: [4,4] });
  }, new Error('Argument height of 8 larger than maximum size of 4 for your GPU'));
});

test('.updateValue() checks too large width', () => {
  const mockKernel = {
    constructor: {
      features: { maxTextureSize: 4 },
    },
    validate: true,
  };

  const v = new webGLKernelValueMaps.single.dynamic.Input({ size: [1, 1], value: [0] }, {
    kernel: mockKernel,
    name: 'test',
    type: 'Input',
    origin: 'user',
    tactic: 'speed',
    onRequestContextHandle: () => 1,
    onRequestTexture: () => null,
    onRequestIndex: () => 1
  });
  assert.throws(() => {
    v.updateValue({
      size: [3,3]
    })
  }, new Error('Argument width of 12 larger than maximum size of 4 for your GPU'));
});

test('.updateValue() checks ok height & width', () => {
  const mockKernel = {
    constructor: {
      features: { maxTextureSize: 4 },
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
  const v = new webGLKernelValueMaps.single.dynamic.Input({ size: [2,2], context: mockContext, value: [0] }, {
    kernel: mockKernel,
    name: 'test',
    type: 'Input',
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
    value: [0]
  });

  assert.equal(v.constructor.name, 'WebGLKernelValueDynamicSingleInput');
});
