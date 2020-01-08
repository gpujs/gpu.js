const { assert, skip, test, module: describe, only } = require('qunit');
const { webGL2KernelValueMaps } = require('../../../../../src');

describe('internal: WebGL2KernelValueDynamicHTMLImage');

test('.updateValue() checks too large height', () => {
  const mockKernel = {
    constructor: {
      features: { maxTextureSize: 1 },
    },
    validate: true,
  };
  const v = new webGL2KernelValueMaps.unsigned.dynamic.HTMLImageArray([{ width: 1, height: 1 }], {
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
    v.updateValue([{ width: 1, height: 2 }]);
  }, new Error('Argument texture height of 2 larger than maximum size of 1 for your GPU'));
});

test('.updateValue() checks too large width', () => {
  const mockKernel = {
    constructor: {
      features: { maxTextureSize: 1 },
    },
    validate: true,
  };

  const v = new webGL2KernelValueMaps.unsigned.dynamic.HTMLImageArray([{ width: 1, height: 1 }], {
    kernel: mockKernel,
    name: 'test',
    type: 'HTMLImageArray',
    origin: 'user',
    tactic: 'speed',
    onRequestContextHandle: () => 1,
    onRequestTexture: () => null,
    onRequestIndex: () => 1
  });
  assert.throws(() => {
    v.updateValue([{
      height: 1,
      width: 2,
    }])
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
    texImage3D: () => {},
    texSubImage3D: () => {},
  };
  const v = new webGL2KernelValueMaps.unsigned.dynamic.HTMLImageArray([{ width: 2, height: 2 }], {
    kernel: mockKernel,
    name: 'test',
    type: 'HTMLImageArray',
    origin: 'user',
    tactic: 'speed',
    context: mockContext,
    onRequestContextHandle: () => 1,
    onRequestTexture: () => null,
    onRequestIndex: () => 1
  });
  v.updateValue([{
    height: 1,
    width: 1,
  }]);

  assert.equal(v.constructor.name, 'WebGL2KernelValueDynamicHTMLImageArray');
});
