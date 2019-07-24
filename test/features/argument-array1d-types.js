const { assert, skip, test, module: describe, only } = require('qunit');
const { GPU } = require('../../src');

describe('argument array 1 types');

function testSinglePrecisionArray1D2(mode) {
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function(value) {
    return value[this.thread.x];
  }, {
    output: [4],
    argumentTypes: { value: 'Array1D(2)' },
    precision: 'single',
  });
  const value = [
    new Float32Array([1,2]),
    new Float32Array([3,4]),
    new Float32Array([5,6]),
    new Float32Array([7,8]),
  ];
  const result = kernel(value);
  assert.deepEqual(result, value);
  gpu.destroy();
}

(GPU.isSinglePrecisionSupported ? test : skip)('single precision Array1D(2) auto', () => {
  testSinglePrecisionArray1D2();
});

(GPU.isSinglePrecisionSupported ? test : skip)('single precision Array1D(2) gpu', () => {
  testSinglePrecisionArray1D2('gpu');
});

(GPU.isSinglePrecisionSupported && GPU.isWebGLSupported ? test : skip)('single precision Array1D(2) webgl', () => {
  testSinglePrecisionArray1D2('webgl');
});

(GPU.isSinglePrecisionSupported && GPU.isWebGL2Supported ? test : skip)('single precision Array1D(2) webgl2', () => {
  testSinglePrecisionArray1D2('webgl2');
});

(GPU.isSinglePrecisionSupported && GPU.isHeadlessGLSupported ? test : skip)('single precision Array1D(2) headlessgl', () => {
  testSinglePrecisionArray1D2('headlessgl');
});

test('single precision Array1D(2) cpu', () => {
  testSinglePrecisionArray1D2('cpu');
});

function testUnsignedPrecisionArray1D2(mode) {
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function(value) {
    return value[this.thread.x];
  }, {
    output: [4],
    argumentTypes: { value: 'Array1D(2)' },
    precision: 'unsigned',
  });
  const value = [
    new Float32Array([1,2]),
    new Float32Array([3,4]),
    new Float32Array([5,6]),
    new Float32Array([7,8]),
  ];
  const result = kernel(value);
  assert.deepEqual(result, value);
  gpu.destroy();
}

test('fallback unsigned precision Array1D(2) auto', () => {
  testUnsignedPrecisionArray1D2();
});

test('fallback unsigned precision Array1D(2) gpu', () => {
  testUnsignedPrecisionArray1D2('gpu');
});

(GPU.isWebGLSupported ? test : skip)('fallback unsigned precision Array1D(2) webgl', () => {
  testUnsignedPrecisionArray1D2('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('fallback unsigned precision Array1D(2) webgl2', () => {
  testUnsignedPrecisionArray1D2('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('fallback unsigned precision Array1D(2) headlessgl', () => {
  testUnsignedPrecisionArray1D2('headlessgl');
});

test('fallback unsigned precision Array1D(2) cpu', () => {
  testUnsignedPrecisionArray1D2('cpu');
});

function testSinglePrecisionArray1D3(mode) {
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function(value) {
    return value[this.thread.x];
  }, {
    output: [4],
    argumentTypes: { value: 'Array1D(3)' },
    precision: 'single',
  });
  const value = [
    new Float32Array([1,2,3]),
    new Float32Array([4,5,6]),
    new Float32Array([7,8,9]),
    new Float32Array([10,11,12]),
  ];
  const result = kernel(value);
  assert.deepEqual(result, value);
  gpu.destroy();
}

(GPU.isSinglePrecisionSupported ? test : skip)('single precision Array1D(3) auto', () => {
  testSinglePrecisionArray1D3();
});

(GPU.isSinglePrecisionSupported ? test : skip)('single precision Array1D(3) gpu', () => {
  testSinglePrecisionArray1D3('gpu');
});

(GPU.isSinglePrecisionSupported && GPU.isWebGLSupported ? test : skip)('single precision Array1D(3) webgl', () => {
  testSinglePrecisionArray1D3('webgl');
});

(GPU.isSinglePrecisionSupported && GPU.isWebGL2Supported ? test : skip)('single precision Array1D(3) webgl2', () => {
  testSinglePrecisionArray1D3('webgl2');
});

(GPU.isSinglePrecisionSupported && GPU.isHeadlessGLSupported ? test : skip)('single precision Array1D(3) headlessgl', () => {
  testSinglePrecisionArray1D3('headlessgl');
});

test('single precision Array1D(3) cpu', () => {
  testSinglePrecisionArray1D3('cpu');
});

function testUnsignedPrecisionArray1D3(mode) {
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function(value) {
    return value[this.thread.x];
  }, {
    output: [4],
    argumentTypes: { value: 'Array1D(3)' },
    precision: 'unsigned',
  });
  const value = [
    new Float32Array([1,2,3]),
    new Float32Array([4,5,6]),
    new Float32Array([7,8,9]),
    new Float32Array([10,11,12]),
  ];
  const result = kernel(value);
  assert.deepEqual(result, value);
  assert.deepEqual(result, value);
  gpu.destroy();
}

test('fallback unsigned precision Array1D(3) auto', () => {
  testUnsignedPrecisionArray1D3();
});

test('fallback unsigned precision Array1D(3) gpu', () => {
  testUnsignedPrecisionArray1D3('gpu');
});

(GPU.isWebGLSupported ? test : skip)('fallback unsigned precision Array1D(3) webgl', () => {
  testUnsignedPrecisionArray1D3('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('fallback unsigned precision Array1D(3) webgl2', () => {
  testUnsignedPrecisionArray1D3('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('fallback unsigned precision Array1D(3) headlessgl', () => {
  testUnsignedPrecisionArray1D3('headlessgl');
});

test('fallback unsigned precision Array1D(3) cpu', () => {
  testUnsignedPrecisionArray1D3('cpu');
});

function testUnsignedPrecisionArray1D4(mode) {
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function(value) {
    return value[this.thread.x];
  }, {
    output: [4],
    argumentTypes: { value: 'Array1D(4)' },
    precision: 'unsigned',
  });
  const value = [
    new Float32Array([1,2,3,4]),
    new Float32Array([5,6,7,8]),
    new Float32Array([9,10,11,12]),
    new Float32Array([13,14,15,16]),
  ];
  const result = kernel(value);
  assert.deepEqual(result, value);
  assert.deepEqual(result, value);
  gpu.destroy();
}

test('fallback unsigned precision Array1D(4) auto', () => {
  testUnsignedPrecisionArray1D4();
});

test('fallback unsigned precision Array1D(4) gpu', () => {
  testUnsignedPrecisionArray1D4('gpu');
});

(GPU.isWebGLSupported ? test : skip)('fallback unsigned precision Array1D(4) webgl', () => {
  testUnsignedPrecisionArray1D4('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('fallback unsigned precision Array1D(4) webgl2', () => {
  testUnsignedPrecisionArray1D4('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('fallback unsigned precision Array1D(4) headlessgl', () => {
  testUnsignedPrecisionArray1D4('headlessgl');
});

test('fallback unsigned precision Array1D(4) cpu', () => {
  testUnsignedPrecisionArray1D4('cpu');
});
