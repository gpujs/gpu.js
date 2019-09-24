const { assert, skip, test, module: describe, only } = require('qunit');
const { webGL2KernelValueMaps } = require('../../../../../src');

describe('internal: WebGL2KernelValueHTMLImageArray');

test('.constructor() checks too large height', () => {
  const mockKernel = {
    constructor: {
      features: { maxTextureSize: 1 },
    },
    validate: true,
  };
  assert.throws(() => {
    new webGL2KernelValueMaps.unsigned.static.HTMLImageArray([{ width: 1, height: 2 }], {
      kernel: mockKernel,
      name: 'test',
      type: 'HTMLImageArray',
      origin: 'user',
      tactic: 'speed',
      onRequestContextHandle: () => 1,
      onRequestTexture: () => null,
      onRequestIndex: () => 1
    });
  }, new Error('Argument height of 2 larger than maximum size of 1 for your GPU'));
});

test('.constructor() checks too large width', () => {
  const mockKernel = {
    constructor: {
      features: { maxTextureSize: 1 },
    },
    validate: true,
  };
  assert.throws(() => {
    new webGL2KernelValueMaps.unsigned.static.HTMLImageArray([{ width: 2, height: 1 }], {
      kernel: mockKernel,
      name: 'test',
      type: 'HTMLImageArray',
      origin: 'user',
      tactic: 'speed',
      onRequestContextHandle: () => 1,
      onRequestTexture: () => null,
      onRequestIndex: () => 1
    });
  }, new Error('Argument width of 2 larger than maximum size of 1 for your GPU'));
});

test('.constructor() checks ok height & width', () => {
  const mockKernel = {
    constructor: {
      features: { maxTextureSize: 2 },
    },
    validate: true,
  };
  const v = new webGL2KernelValueMaps.unsigned.static.HTMLImageArray([{ width: 2, height: 2 }], {
    kernel: mockKernel,
    name: 'test',
    type: 'HTMLImageArray',
    origin: 'user',
    tactic: 'speed',
    onRequestContextHandle: () => 1,
    onRequestTexture: () => null,
    onRequestIndex: () => 1
  });
  assert.equal(v.constructor.name, 'WebGL2KernelValueHTMLImageArray');
});
