const { assert, test, module: describe } = require('qunit');
const { WebGLKernel, WebGL2Kernel } = require('../../src');

describe('internal: webgl precision fallback');

// Real devices exist whose WebGL1 context has no OES_texture_float — Chrome on
// a Google Pixel 7, for one. WebGLKernel used to leave `precision` null there
// instead of falling back to unsigned, and every kernel then died in
// lookupKernelValueType with "precision missing", or in renderStrategy with
// 'unhandled precision of "null"'. A WebGL1 context is not constructable under
// node, so drive validateSettings directly with the feature set of interest.
function validateWith(Kernel, features, settings) {
  const kernel = Object.assign({
    validate: true,
    constructor: { features },
    precision: null,
    graphical: false,
    optimizeFloatMemory: false,
    fixIntegerDivisionAccuracy: null,
    subKernels: null,
    extensions: { WEBGL_draw_buffers: true },
    output: [4],
    checkOutput() {},
    checkTextureSize() {}
  }, settings);
  Kernel.prototype.validateSettings.call(kernel, [[1, 2, 3, 4]]);
  return kernel;
}

const noFloatTextures = {
  isFloatRead: false,
  isTextureFloat: false,
  isIntegerDivisionAccurate: true,
  kernelMap: false
};

const floatTextures = {
  isFloatRead: true,
  isTextureFloat: true,
  isIntegerDivisionAccurate: true,
  kernelMap: true
};

test('webgl falls back to unsigned without float textures', () => {
  const kernel = validateWith(WebGLKernel, noFloatTextures);
  assert.equal(kernel.precision, 'unsigned');
  assert.ok(kernel.texSize, 'texSize was computed');
});

test('webgl still picks single when float textures are readable', () => {
  const kernel = validateWith(WebGLKernel, floatTextures);
  assert.equal(kernel.precision, 'single');
});

test('webgl picks unsigned when float textures exist but are not readable', () => {
  const kernel = validateWith(WebGLKernel, Object.assign({}, floatTextures, { isFloatRead: false }));
  assert.equal(kernel.precision, 'unsigned');
});

test('webgl leaves an explicit precision alone', () => {
  const kernel = validateWith(WebGLKernel, noFloatTextures, { precision: 'unsigned' });
  assert.equal(kernel.precision, 'unsigned');
});

test('webgl still rejects single precision it cannot honour', () => {
  assert.throws(() => {
    validateWith(WebGLKernel, noFloatTextures, { precision: 'single' });
  }, /Single precision not supported/);
});

test('webgl still rejects optimizeFloatMemory without float textures', () => {
  assert.throws(() => {
    validateWith(WebGLKernel, noFloatTextures, { optimizeFloatMemory: true });
  }, /Float textures are not supported/);
});

test('webgl2 falls back to unsigned when floats are not readable', () => {
  const kernel = validateWith(WebGL2Kernel, Object.assign({}, floatTextures, { isFloatRead: false }));
  assert.equal(kernel.precision, 'unsigned');
});
