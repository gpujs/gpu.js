const { assert, skip, test, module: describe, only } = require('qunit');
const { webGLKernelValueMaps } = require('../../../../../src');

describe('internal: WebGLKernelValueHTMLImage');

test('.constructor() checks too large height', () => {
  const mockKernel = {
    constructor: {
      features: { maxTextureSize: 1 },
    },
    validate: true,
  };
  assert.throws(() => {
    new webGLKernelValueMaps.unsigned.static.HTMLImage({ width: 1, height: 2 }, {
      kernel: mockKernel,
      name: 'test',
      type: 'HTMLImage',
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
    new webGLKernelValueMaps.unsigned.static.HTMLImage({ width: 2, height: 1 }, {
      kernel: mockKernel,
      name: 'test',
      type: 'HTMLImage',
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
  };
  const v = new webGLKernelValueMaps.unsigned.static.HTMLImage({ width: 2, height: 2 }, {
    kernel: mockKernel,
    name: 'test',
    type: 'HTMLImage',
    origin: 'user',
    tactic: 'speed',
    onRequestContextHandle: () => 1,
    onRequestTexture: () => null,
    onRequestIndex: () => 1
  });
  assert.equal(v.constructor.name, 'WebGLKernelValueHTMLImage');
});
