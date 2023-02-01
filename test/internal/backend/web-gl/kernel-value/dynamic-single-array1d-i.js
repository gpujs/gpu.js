const { assert, skip, test, module: describe, only } = require('qunit');
const { webGLKernelValueMaps } = require('../../../../..');

describe('internal: WebGLKernelValueDynamicSingleArray1DI');

test('.updateValue() checks too large', () => {
  const mockKernel = {
    constructor: {
      features: { maxTextureSize: 1 },
    },
    validate: true,
  };
  const v = new webGLKernelValueMaps.single.dynamic['Array1D(2)']([[1, 2]], {
    kernel: mockKernel,
    name: 'test',
    type: 'Array1D(2)',
    origin: 'user',
    tactic: 'speed',
    onRequestContextHandle: () => 1,
    onRequestTexture: () => null,
    onRequestIndex: () => 1,
  });

  assert.throws(() => {
    v.updateValue([
      [1, 2],
      [3, 4],
      [5, 6],
      [7, 8],
    ]);
  }, new Error('Argument texture height of 2 larger than maximum size of 1 for your GPU'));
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
  const v = new webGLKernelValueMaps.single.dynamic['Array1D(2)']([[1, 2]], {
    kernel: mockKernel,
    name: 'test',
    type: 'Array1D(2)',
    origin: 'user',
    tactic: 'speed',
    context: mockContext,
    onRequestContextHandle: () => 1,
    onRequestTexture: () => null,
    onRequestIndex: () => 1,
  });
  v.updateValue(new Array(new Array([2, 1])));

  assert.equal(v.constructor.name, 'WebGLKernelValueDynamicSingleArray1DI');
});
