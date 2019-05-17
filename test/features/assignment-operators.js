const { assert, skip, test, module: describe, only } = require('qunit');
const { GPU } = require('../../src');

describe('features: assignment operators');

function equal(mode) {
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function() {
    let i = 3;
    return i;
  }, { output: [1] });
  const result = kernel();
  assert.equal(result[0], 3);
  gpu.destroy();
}

test('equal auto', () => {
  equal();
});

(GPU.isGPUSupported ? test : skip)('equal gpu', () => {
  equal('gpu');
});

(GPU.isWebGLSupported ? test : skip)('equal webgl', () => {
  equal('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('equal webgl2', () => {
  equal('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('equal headlessgl', () => {
  equal('headlessgl');
});

test('equal cpu', () => {
  equal('cpu');
});

function plusEqual(mode) {
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function() {
    let i = 3;
    i += 3;
    return i;
  }, { output: [1] });
  const result = kernel();
  let i = 3;
  i += 3;
  assert.equal(result[0], i);
  gpu.destroy();
}

test('plus equal auto', () => {
  plusEqual();
});

(GPU.isGPUSupported ? test : skip)('plus equal gpu', () => {
  plusEqual('gpu');
});

(GPU.isWebGLSupported ? test : skip)('plus equal webgl', () => {
  plusEqual('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('plus equal webgl2', () => {
  plusEqual('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('plus equal headlessgl', () => {
  plusEqual('headlessgl');
});

test('plus equal cpu', () => {
  plusEqual('cpu');
});

function minusEqual(mode) {
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function() {
    let i = 6;
    i -= 3;
    return i;
  }, { output: [1] });
  const result = kernel();
  let i = 6;
  i -= 3;
  assert.equal(result[0], i);
  gpu.destroy();
}

test('minus equal auto', () => {
  minusEqual();
});

(GPU.isGPUSupported ? test : skip)('minus equal gpu', () => {
  minusEqual('gpu');
});

(GPU.isWebGLSupported ? test : skip)('minus equal webgl', () => {
  minusEqual('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('minus equal webgl2', () => {
  minusEqual('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('minus equal headlessgl', () => {
  minusEqual('headlessgl');
});

test('minus equal cpu', () => {
  minusEqual('cpu');
});

function multiplyEqual(mode) {
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function() {
    let i = 6;
    i *= 3;
    return i;
  }, { output: [1] });
  const result = kernel();
  let i = 6;
  i *= 3;
  assert.equal(result[0], i);
  gpu.destroy();
}

test('multiply equal auto', () => {
  multiplyEqual();
});

(GPU.isGPUSupported ? test : skip)('multiply equal gpu', () => {
  multiplyEqual('gpu');
});

(GPU.isWebGLSupported ? test : skip)('multiply equal webgl', () => {
  multiplyEqual('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('multiply equal webgl2', () => {
  multiplyEqual('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('multiply equal headlessgl', () => {
  multiplyEqual('headlessgl');
});

test('multiply equal cpu', () => {
  multiplyEqual('cpu');
});

function divideEqual(mode) {
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function() {
    let i = 6;
    i /= 3;
    return i;
  }, { output: [1] });
  const result = kernel();
  let i = 6;
  i /= 3;
  assert.equal(result[0], i);
  gpu.destroy();
}

test('divide equal auto', () => {
  divideEqual();
});

(GPU.isGPUSupported ? test : skip)('divide equal gpu', () => {
  divideEqual('gpu');
});

(GPU.isWebGLSupported ? test : skip)('divide equal webgl', () => {
  divideEqual('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('divide equal webgl2', () => {
  divideEqual('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('divide equal headlessgl', () => {
  divideEqual('headlessgl');
});

test('divide equal cpu', () => {
  divideEqual('cpu');
});


function modulusEqual(mode) {
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function() {
    let i = 2;
    i %= 3;
    return i;
  }, { output: [1] });
  const result = kernel();
  let i = 2;
  i %= 3;
  assert.equal(result[0], i);
  gpu.destroy();
}

test('modulus equal auto', () => {
  modulusEqual();
});

(GPU.isGPUSupported ? test : skip)('modulus equal gpu', () => {
  modulusEqual('gpu');
});

(GPU.isWebGLSupported ? test : skip)('modulus equal webgl', () => {
  modulusEqual('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('modulus equal webgl2', () => {
  divideEqual('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('modulus equal headlessgl', () => {
  modulusEqual('headlessgl');
});

test('modulus equal cpu', () => {
  modulusEqual('cpu');
});

function exponentialEqual(mode) {
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function() {
    let i = 2;
    i **= 3;
    return i;
  }, { output: [1] });
  const result = kernel();
  let i = 2;
  i **= 3;
  assert.equal(result[0], i);
  gpu.destroy();
}

test('exponential equal auto', () => {
  exponentialEqual();
});

(GPU.isGPUSupported ? test : skip)('exponential equal gpu', () => {
  exponentialEqual('gpu');
});

(GPU.isWebGLSupported ? test : skip)('exponential equal webgl', () => {
  exponentialEqual('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('exponential equal webgl2', () => {
  exponentialEqual('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('exponential equal headlessgl', () => {
  exponentialEqual('headlessgl');
});

test('exponential equal cpu', () => {
  exponentialEqual('cpu');
});
