const { assert, skip, test, module: describe, only } = require('qunit');
const { webGLKernelValueMaps } = require('../../../../../src');

describe('internal: WebGLKernelValueUnsignedArray');

test('.constructor() checks too large height', () => {
  const mockKernel = {
    constructor: {
      features: { maxTextureSize: 1 },
    },
    validate: true,
  };
  assert.throws(() => {
    new webGLKernelValueMaps.unsigned.static.Array([1,2], {
      kernel: mockKernel,
      name: 'test',
      type: 'Array',
      origin: 'user',
      tactic: 'speed',
      onRequestContextHandle: () => 1,
      onRequestTexture: () => null,
      onRequestIndex: () => 1
    });
  }, new Error('Argument texture height and width of 2 larger than maximum size of 1 for your GPU'));
});

test('.constructor() checks ok height & width', () => {
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
  const v = new webGLKernelValueMaps.unsigned.static.Array([1,2], {
    kernel: mockKernel,
    name: 'test',
    type: 'Array',
    origin: 'user',
    tactic: 'speed',
    context: mockContext,
    onRequestContextHandle: () => 1,
    onRequestTexture: () => null,
    onRequestIndex: () => 1
  });
  assert.equal(v.constructor.name, 'WebGLKernelValueUnsignedArray');
});
