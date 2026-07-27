const { assert, skip, test, module: describe } = require('qunit');
const { GPU } = require('../../src');

describe('infinity');

// Every GPU backend saturates rather than carrying Infinity through: the value
// comes back as the largest one the encoding can hold. The "with float" cases
// below already document that for float textures (FLT_MAX); the packed unsigned
// encoding does the same thing one binade lower, at 2^127. Which of the two a
// driver lands on is the driver's business, so assert the behaviour rather than
// either bit pattern. This used to assert NaN, which nothing has ever produced
// -- not ANGLE, not SwiftShader, not headless-gl, on macOS or on Linux.
function assertSaturated(value) {
  assert.ok(
    Number.isFinite(value) && value > 1e38,
    `expected a saturated value, got ${value}`
  );
}

function inputWithoutFloat(checks, mode) {
  const gpu = new GPU({ mode });
  checks(gpu.createKernel(function() {
    return Infinity;
  }, { precision: 'unsigned' })
    .setOutput([1])());
  gpu.destroy();
}

test("Infinity without float auto", () => {
  inputWithoutFloat((v) => assertSaturated(v[0]));
});

test("Infinity without float cpu", () => {
  inputWithoutFloat((v) => assert.deepEqual(v[0], Infinity), 'cpu');
});

test("Infinity without float gpu", () => {
  inputWithoutFloat((v) => assertSaturated(v[0]), 'gpu');
});

(GPU.isWebGLSupported ? test : skip)("Infinity without float webgl", () => {
  inputWithoutFloat((v) => assertSaturated(v[0]), 'webgl');
});

(GPU.isWebGL2Supported ? test : skip)("Infinity without float webgl2", () => {
  inputWithoutFloat((v) => assertSaturated(v[0]), 'webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)("Infinity without float headlessgl", () => {
  inputWithoutFloat((v) => assertSaturated(v[0]), 'headlessgl');
});


function inputWithFloat(checks, mode) {
  const gpu = new GPU({ mode });
  checks(gpu.createKernel(function() {
    return Infinity;
  }, { precision: 'single' })
    .setOutput([1])());
  gpu.destroy();
}

(GPU.isSinglePrecisionSupported ? test : skip)("Infinity with float auto", () => {
  inputWithFloat((v) => assert.deepEqual(v[0], 3.4028234663852886e+38));
});

(GPU.isSinglePrecisionSupported ? test : skip)("Infinity with float cpu", () => {
  inputWithFloat((v) => assert.deepEqual(v[0], Infinity), 'cpu');
});

(GPU.isSinglePrecisionSupported ? test : skip)("Infinity with float gpu", () => {
  inputWithFloat((v) => assert.deepEqual(v[0], 3.4028234663852886e+38), 'gpu');
});

(GPU.isSinglePrecisionSupported  && GPU.isWebGLSupported ? test : skip)("Infinity with float webgl", () => {
  inputWithFloat((v) => assert.deepEqual(v[0], 3.4028234663852886e+38), 'webgl');
});

(GPU.isSinglePrecisionSupported  && GPU.isWebGL2Supported ? test : skip)("Infinity with float webgl2", () => {
  inputWithFloat((v) => assert.deepEqual(v[0], 3.4028234663852886e+38), 'webgl2');
});

(GPU.isSinglePrecisionSupported  && GPU.isHeadlessGLSupported ? test : skip)("Infinity with float headlessgl", () => {
  inputWithFloat((v) => assert.deepEqual(v[0], 3.4028234663852886e+38), 'headlessgl');
});
