const { assert, skip, test, module: describe } = require('qunit');
const { GPU } = require('../../src');

describe('infinity');
function inputWithoutFloat(checks, mode) {
  const gpu = new GPU({ mode });
  checks(gpu.createKernel(function() {
    return Infinity;
  }, { floatOutput: false })
    .setOutput([1])());
  gpu.destroy();
}

test("Infinity without float auto", () => {
  inputWithoutFloat((v) => assert.deepEqual(v[0], NaN));
});

test("Infinity without float cpu", () => {
  inputWithoutFloat((v) => assert.deepEqual(v[0], Infinity), 'cpu');
});

test("Infinity without float gpu", () => {
  inputWithoutFloat((v) => assert.deepEqual(v[0], NaN), 'gpu');
});

(GPU.isWebGLSupported ? test : skip)("Infinity without float webgl", () => {
  inputWithoutFloat((v) => assert.deepEqual(v[0], NaN), 'webgl');
});

(GPU.isWebGL2Supported ? test : skip)("Infinity without float webgl2", () => {
  inputWithoutFloat((v) => assert.deepEqual(v[0], NaN), 'webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)("Infinity without float headlessgl", () => {
  inputWithoutFloat((v) => assert.deepEqual(v[0], NaN), 'headlessgl');
});


function inputWithFloat(checks, mode) {
  const gpu = new GPU({ mode });
  checks(gpu.createKernel(function() {
    return Infinity;
  }, { floatOutput: true })
    .setOutput([1])());
  gpu.destroy();
}

test("Infinity with float auto", () => {
  inputWithFloat((v) => assert.deepEqual(v[0], 3.4028234663852886e+38));
});

test("Infinity with float cpu", () => {
  inputWithFloat((v) => assert.deepEqual(v[0], Infinity), 'cpu');
});

test("Infinity with float gpu", () => {
  inputWithFloat((v) => assert.deepEqual(v[0], 3.4028234663852886e+38), 'gpu');
});

(GPU.isWebGLSupported ? test : skip)("Infinity with float webgl", () => {
  inputWithFloat((v) => assert.deepEqual(v[0], 3.4028234663852886e+38), 'webgl');
});

(GPU.isWebGL2Supported ? test : skip)("Infinity with float webgl2", () => {
  inputWithFloat((v) => assert.deepEqual(v[0], 3.4028234663852886e+38), 'webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)("Infinity with float headlessgl", () => {
  inputWithFloat((v) => assert.deepEqual(v[0], 3.4028234663852886e+38), 'headlessgl');
});
