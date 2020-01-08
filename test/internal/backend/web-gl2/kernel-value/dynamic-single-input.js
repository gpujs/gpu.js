const { assert, skip, test, module: describe, only } = require('qunit');
const { webGL2KernelValueMaps } = require('../../../../../src');

describe('internal: WebGLKernelValueDynamicSingleInput');

test('.updateValue() checks too large height', () => {
  const mockKernel = {
    constructor: {
      features: { maxTextureSize: 4 },
    },
    validate: true,
  };
  const v = new webGL2KernelValueMaps.single.dynamic.Input({ size: [5, 5], value: [0] }, {
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
    v.updateValue({ size: [16,16] });
  }, new Error('Argument texture height and width of 8 larger than maximum size of 4 for your GPU'));
});

test('.updateValue() checks too large width', () => {
  const mockKernel = {
    constructor: {
      features: { maxTextureSize: 4 },
    },
    validate: true,
  };

  const v = new webGL2KernelValueMaps.single.dynamic.Input({ size: [1, 1], value: [0] }, {
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
      size: [12,12]
    })
  }, new Error('Argument texture height and width of 6 larger than maximum size of 4 for your GPU'));
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
  const v = new webGL2KernelValueMaps.single.dynamic.Input({ size: [2,2], context: mockContext, value: [0] }, {
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

  assert.equal(v.constructor.name, 'WebGL2KernelValueDynamicSingleInput');
});
