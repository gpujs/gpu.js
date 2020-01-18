const { assert, skip, test, module: describe, only } = require('qunit');
const { GPU } = require('../../src');

describe('features: arithmetic operators');

function addition(mode) {
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function() {
    return 3 + 2;
  }, { output: [1] });
  const result = kernel();
  assert.equal(result[0], 3 + 2);
  gpu.destroy();
}

test('addition auto', () => {
  addition();
});

(GPU.isGPUSupported ? test : skip)('addition gpu', () => {
  addition('gpu');
});

(GPU.isWebGLSupported ? test : skip)('addition webgl', () => {
  addition('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('addition webgl2', () => {
  addition('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('addition headlessgl', () => {
  addition('headlessgl');
});

test('addition cpu', () => {
  addition('cpu');
});


function subtraction(mode) {
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function() {
    return 3 - 2;
  }, { output: [1] });
  const result = kernel();
  assert.equal(result[0], 3 - 2);
  gpu.destroy();
}

test('subtraction auto', () => {
  subtraction();
});

(GPU.isGPUSupported ? test : skip)('subtraction gpu', () => {
  subtraction('gpu');
});

(GPU.isWebGLSupported ? test : skip)('subtraction webgl', () => {
  subtraction('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('subtraction webgl2', () => {
  subtraction('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('subtraction headlessgl', () => {
  subtraction('headlessgl');
});

test('subtraction cpu', () => {
  subtraction('cpu');
});

function multiplication(mode) {
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function() {
    return 3 * 2;
  }, { output: [1] });
  const result = kernel();
  assert.equal(result[0], 3 * 2);
  gpu.destroy();
}

test('multiplication auto', () => {
  multiplication();
});

(GPU.isGPUSupported ? test : skip)('multiplication gpu', () => {
  multiplication('gpu');
});

(GPU.isWebGLSupported ? test : skip)('multiplication webgl', () => {
  multiplication('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('multiplication webgl2', () => {
  multiplication('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('multiplication headlessgl', () => {
  multiplication('headlessgl');
});

test('multiplication cpu', () => {
  multiplication('cpu');
});

function exponential(mode) {
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function() {
    return 3 ** 2;
  }, { output: [1] });
  const result = kernel();
  assert.equal(result[0], 3 ** 2);
  gpu.destroy();
}

test('exponential auto', () => {
  exponential();
});

(GPU.isGPUSupported ? test : skip)('exponential gpu', () => {
  exponential('gpu');
});

(GPU.isWebGLSupported ? test : skip)('exponential webgl', () => {
  exponential('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('exponential webgl2', () => {
  exponential('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('exponential headlessgl', () => {
  exponential('headlessgl');
});

test('exponential cpu', () => {
  exponential('cpu');
});

function division(mode) {
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function() {
    return 3 / 2;
  }, { output: [1] });
  const result = kernel();
  assert.equal(result[0], 3 / 2);
  gpu.destroy();
}

test('division auto', () => {
  division();
});

(GPU.isGPUSupported ? test : skip)('division gpu', () => {
  division('gpu');
});

(GPU.isWebGLSupported ? test : skip)('division webgl', () => {
  division('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('division webgl2', () => {
  division('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('division headlessgl', () => {
  division('headlessgl');
});

test('division cpu', () => {
  division('cpu');
});

function modulus(mode) {
  const gpu = new GPU({ mode });
  const kernel1 = gpu.createKernel(function() {
    return 3 % 2;
  }, { output: [1] });
  assert.equal(kernel1()[0], 3 % 2);

  const kernel2 = gpu.createKernel(function() {
    return -126 % 63.5;
  }, { output: [1] });
  assert.equal(kernel2()[0], -126 % 63.5);

  gpu.destroy();
}

test('modulus auto', () => {
  modulus();
});

(GPU.isGPUSupported ? test : skip)('modulus gpu', () => {
  modulus('gpu');
});

(GPU.isWebGLSupported ? test : skip)('modulus webgl', () => {
  modulus('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('modulus webgl2', () => {
  modulus('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('modulus headlessgl', () => {
  modulus('headlessgl');
});

test('modulus cpu', () => {
  modulus('cpu');
});

function modulusVariable(mode) {
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function(v) {
    return 91 % 7;
  }, { output: [1] });
  assert.equal(kernel(7)[0], 0);
  gpu.destroy();
}

test('modulus variable auto', () => {
  modulusVariable();
});


function increment(mode) {
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function() {
    let i = 3;
    i++;
    return i;
  }, { output: [1] });
  const result = kernel();
  let i = 3;
  i++;
  assert.equal(result[0], i);
  gpu.destroy();
}

test('increment auto', () => {
  increment();
});

(GPU.isGPUSupported ? test : skip)('increment gpu', () => {
  increment('gpu');
});

(GPU.isWebGLSupported ? test : skip)('increment webgl', () => {
  increment('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('increment webgl2', () => {
  increment('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('increment headlessgl', () => {
  increment('headlessgl');
});

test('increment cpu', () => {
  increment('cpu');
});

function incrementEarlyReturn(mode) {
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function() {
    let i = 3;
    return i++;
  }, { output: [1] });
  const result = kernel();
  let i = 3;
  assert.equal(result[0], i++);
  gpu.destroy();
}

test('increment early return auto', () => {
  incrementEarlyReturn();
});

(GPU.isGPUSupported ? test : skip)('increment early return gpu', () => {
  incrementEarlyReturn('gpu');
});

(GPU.isWebGLSupported ? test : skip)('increment early return webgl', () => {
  incrementEarlyReturn('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('increment early return webgl2', () => {
  incrementEarlyReturn('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('increment early return headlessgl', () => {
  incrementEarlyReturn('headlessgl');
});

test('increment early return cpu', () => {
  incrementEarlyReturn('cpu');
});

function decrement(mode) {
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function() {
    let i = 3;
    i--;
    return i;
  }, { output: [1] });
  const result = kernel();
  let i = 3;
  i--;
  assert.equal(result[0], i);
  gpu.destroy();
}

test('decrement auto', () => {
  decrement();
});

(GPU.isGPUSupported ? test : skip)('decrement gpu', () => {
  decrement('gpu');
});

(GPU.isWebGLSupported ? test : skip)('decrement webgl', () => {
  decrement('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('decrement webgl2', () => {
  decrement('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('decrement headlessgl', () => {
  decrement('headlessgl');
});

test('decrement cpu', () => {
  decrement('cpu');
});

function decrementEarlyReturn(mode) {
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function() {
    let i = 3;
    return i--;
  }, { output: [1] });
  const result = kernel();
  let i = 3;
  assert.equal(result[0], i--);
  gpu.destroy();
}

test('decrement early return auto', () => {
  decrementEarlyReturn();
});

(GPU.isGPUSupported ? test : skip)('decrement early return gpu', () => {
  decrementEarlyReturn('gpu');
});

(GPU.isWebGLSupported ? test : skip)('decrement early return webgl', () => {
  decrementEarlyReturn('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('decrement early return webgl2', () => {
  decrementEarlyReturn('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('decrement early return headlessgl', () => {
  decrementEarlyReturn('headlessgl');
});

test('decrement early return cpu', () => {
  decrementEarlyReturn('cpu');
});
