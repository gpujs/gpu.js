const { assert, skip, test, module: describe, only } = require('qunit');
const { webGLKernelValueMaps } = require('../../../../../src');

describe('internal: WebGLKernelValueUnsignedSingleInput');

test('.updateValue() checks too large', () => {
  const mockKernel = {
    constructor: {
      features: { maxTextureSize: 4 },
    },
    validate: true,
  };

  const v = new webGLKernelValueMaps.unsigned.dynamic.Input({ size: [1, 1], value: [0] }, {
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
      size: [8,8],
      value: [0]
    });
  }, new Error('Argument texture height and width of 8 larger than maximum size of 4 for your GPU'));
});

test('.updateValue() checks ok', () => {
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
  const v = new webGLKernelValueMaps.unsigned.dynamic.Input({ size: [2,2], context: mockContext, value: [0] }, {
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
  assert.equal(v.constructor.name, 'WebGLKernelValueDynamicUnsignedInput');
});
