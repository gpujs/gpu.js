const { assert, skip, test, module: describe, only } = require('qunit');
const { webGLKernelValueMaps } = require('../../../../../src');

describe('internal: WebGLKernelValueDynamicUnsignedArray');

test('.updateValue() checks too large', () => {
  const mockKernel = {
    constructor: {
      features: { maxTextureSize: 2 },
    },
    validate: true,
  };
  const v = new webGLKernelValueMaps.unsigned.dynamic.Array([1,2], {
    kernel: mockKernel,
    name: 'test',
    type: 'Array',
    origin: 'user',
    tactic: 'speed',
    onRequestContextHandle: () => 1,
    onRequestTexture: () => null,
    onRequestIndex: () => 1
  });

  assert.throws(() => {
    v.updateValue(new Array([1,2,3,4,5,6,7,8]));
  }, new Error('Argument texture width of 4 larger than maximum size of 2 for your GPU'));
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
  const v = new webGLKernelValueMaps.unsigned.dynamic.Array([1,2], {
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
  v.updateValue(new Array([2,1]));

  assert.equal(v.constructor.name, 'WebGLKernelValueDynamicUnsignedArray');
});
