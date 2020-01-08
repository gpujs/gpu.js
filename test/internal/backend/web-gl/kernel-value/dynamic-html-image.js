const { assert, skip, test, module: describe, only } = require('qunit');
const { webGLKernelValueMaps } = require('../../../../../src');

describe('internal: WebGLKernelValueDynamicHTMLImage');

test('.updateValue() checks too large height', () => {
  const mockKernel = {
    constructor: {
      features: { maxTextureSize: 1 },
    },
    validate: true,
  };
  const v = new webGLKernelValueMaps.unsigned.dynamic.HTMLImage({ width: 1, height: 1 }, {
    kernel: mockKernel,
    name: 'test',
    type: 'HTMLImage',
    origin: 'user',
    tactic: 'speed',
    onRequestContextHandle: () => 1,
    onRequestTexture: () => null,
    onRequestIndex: () => 1
  });

  assert.throws(() => {
    v.updateValue({ width: 1, height: 2 });
  }, new Error('Argument texture height of 2 larger than maximum size of 1 for your GPU'));
});

test('.updateValue() checks too large width', () => {
  const mockKernel = {
    constructor: {
      features: { maxTextureSize: 1 },
    },
    validate: true,
  };

  const v = new webGLKernelValueMaps.unsigned.dynamic.HTMLImage({ width: 1, height: 1 }, {
    kernel: mockKernel,
    name: 'test',
    type: 'HTMLImage',
    origin: 'user',
    tactic: 'speed',
    onRequestContextHandle: () => 1,
    onRequestTexture: () => null,
    onRequestIndex: () => 1
  });
  assert.throws(() => {
    v.updateValue({
      height: 1,
      width: 2,
    })
  }, new Error('Argument texture width of 2 larger than maximum size of 1 for your GPU'));
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
  };
  const mockContext = {
    activeTexture: () => {},
    bindTexture: () => {},
    texParameteri: () => {},
    pixelStorei: () => {},
    texImage2D: () => {},
  };
  const v = new webGLKernelValueMaps.unsigned.dynamic.HTMLImage({ width: 2, height: 2 }, {
    kernel: mockKernel,
    name: 'test',
    type: 'HTMLImage',
    origin: 'user',
    tactic: 'speed',
    context: mockContext,
    onRequestContextHandle: () => 1,
    onRequestTexture: () => null,
    onRequestIndex: () => 1
  });
  v.updateValue({
    height: 1,
    width: 1,
  });

  assert.equal(v.constructor.name, 'WebGLKernelValueDynamicHTMLImage');
});
