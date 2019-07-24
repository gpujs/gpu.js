const { assert, skip, test, module: describe, only } = require('qunit');
const { GPU } = require('../../src');

describe('argument array types');

function testSinglePrecisionArray2(mode) {
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function(value) {
    return value[0] + value[1];
  }, {
    output: [1],
    argumentTypes: { value: 'Array(2)' },
    precision: 'single',
  });
  const result = kernel(new Float32Array([1,2]));
  assert.equal(result[0], 3);
  gpu.destroy();
}

(GPU.isSinglePrecisionSupported ? test : skip)('single precision Array(2) auto', () => {
  testSinglePrecisionArray2();
});

(GPU.isSinglePrecisionSupported ? test : skip)('single precision Array(2) gpu', () => {
  testSinglePrecisionArray2('gpu');
});

(GPU.isSinglePrecisionSupported && GPU.isWebGLSupported ? test : skip)('single precision Array(2) webgl', () => {
  testSinglePrecisionArray2('webgl');
});

(GPU.isSinglePrecisionSupported && GPU.isWebGL2Supported ? test : skip)('single precision Array(2) webgl2', () => {
  testSinglePrecisionArray2('webgl2');
});

(GPU.isSinglePrecisionSupported && GPU.isHeadlessGLSupported ? test : skip)('single precision Array(2) headlessgl', () => {
  testSinglePrecisionArray2('headlessgl');
});

test('single precision Array(2) cpu', () => {
  testSinglePrecisionArray2('cpu');
});

function testUnsignedPrecisionArray2(mode) {
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function(value) {
    return value[0] + value[1];
  }, {
    output: [1],
    argumentTypes: { value: 'Array(2)' },
    precision: 'unsigned',
  });
  const result = kernel(new Float32Array([1,2]));
  assert.equal(result[0], 3);
  gpu.destroy();
}

test('unsigned precision Array(2) auto', () => {
  testUnsignedPrecisionArray2();
});

test('unsigned precision Array(2) gpu', () => {
  testUnsignedPrecisionArray2('gpu');
});

(GPU.isWebGLSupported ? test : skip)('unsigned precision Array(2) webgl', () => {
  testUnsignedPrecisionArray2('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('unsigned precision Array(2) webgl2', () => {
  testUnsignedPrecisionArray2('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('unsigned precision Array(2) headlessgl', () => {
  testUnsignedPrecisionArray2('headlessgl');
});

test('unsigned precision Array(2) cpu', () => {
  testUnsignedPrecisionArray2('cpu');
});

function testSinglePrecisionArray3(mode) {
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function(value) {
    return value[0] + value[1] + value[2];
  }, {
    output: [1],
    argumentTypes: { value: 'Array(3)' },
    precision: 'single',
  });
  const result = kernel(new Float32Array([1,2,3]));
  assert.equal(result[0], 6);
  gpu.destroy();
}

(GPU.isSinglePrecisionSupported ? test : skip)('single precision Array(3) auto', () => {
  testSinglePrecisionArray3();
});

(GPU.isSinglePrecisionSupported ? test : skip)('single precision Array(3) gpu', () => {
  testSinglePrecisionArray3('gpu');
});

(GPU.isSinglePrecisionSupported && GPU.isWebGLSupported ? test : skip)('single precision Array(3) webgl', () => {
  testSinglePrecisionArray3('webgl');
});

(GPU.isSinglePrecisionSupported && GPU.isWebGL2Supported ? test : skip)('single precision Array(3) webgl2', () => {
  testSinglePrecisionArray3('webgl2');
});

(GPU.isSinglePrecisionSupported && GPU.isHeadlessGLSupported ? test : skip)('single precision Array(3) headlessgl', () => {
  testSinglePrecisionArray3('headlessgl');
});

test('single precision Array(3) cpu', () => {
  testSinglePrecisionArray3('cpu');
});

function testUnsignedPrecisionArray3(mode) {
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function(value) {
    return value[0] + value[1] + value[2];
  }, {
    output: [1],
    argumentTypes: { value: 'Array(3)' },
    precision: 'unsigned',
  });
  const result = kernel(new Float32Array([1,2,3]));
  assert.equal(result[0], 6);
  gpu.destroy();
}

test('unsigned precision Array(3) auto', () => {
  testUnsignedPrecisionArray3();
});

test('unsigned precision Array(3) gpu', () => {
  testUnsignedPrecisionArray3('gpu');
});

(GPU.isWebGLSupported ? test : skip)('unsigned precision Array(3) webgl', () => {
  testUnsignedPrecisionArray3('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('unsigned precision Array(3) webgl2', () => {
  testUnsignedPrecisionArray3('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('unsigned precision Array(3) headlessgl', () => {
  testUnsignedPrecisionArray3('headlessgl');
});

test('unsigned precision Array(3) cpu', () => {
  testUnsignedPrecisionArray3('cpu');
});

function testSinglePrecisionArray4(mode) {
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function(value) {
    return value[0] + value[1] + value[2] + value[3];
  }, {
    output: [1],
    argumentTypes: { value: 'Array(4)' },
    precision: 'single',
  });
  const result = kernel(new Float32Array([1,2,3,4]));
  assert.equal(result[0], 10);
  gpu.destroy();
}

(GPU.isSinglePrecisionSupported ? test : skip)('single precision Array(4) auto', () => {
  testSinglePrecisionArray4();
});

(GPU.isSinglePrecisionSupported ? test : skip)('single precision Array(4) gpu', () => {
  testSinglePrecisionArray4('gpu');
});

(GPU.isSinglePrecisionSupported && GPU.isWebGLSupported ? test : skip)('single precision Array(4) webgl', () => {
  testSinglePrecisionArray4('webgl');
});

(GPU.isSinglePrecisionSupported && GPU.isWebGL2Supported ? test : skip)('single precision Array(4) webgl2', () => {
  testSinglePrecisionArray4('webgl2');
});

(GPU.isSinglePrecisionSupported && GPU.isHeadlessGLSupported ? test : skip)('single precision Array(4) headlessgl', () => {
  testSinglePrecisionArray4('headlessgl');
});

test('single precision Array(4) cpu', () => {
  testSinglePrecisionArray4('cpu');
});

function testUnsignedPrecisionArray4(mode) {
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function(value) {
    return value[0] + value[1] + value[2] + value[3];
  }, {
    output: [1],
    argumentTypes: { value: 'Array(4)' },
    precision: 'unsigned',
  });
  const result = kernel(new Float32Array([1,2,3,4]));
  assert.equal(result[0], 10);
  gpu.destroy();
}

test('unsigned precision Array(4) auto', () => {
  testUnsignedPrecisionArray4();
});

test('unsigned precision Array(4) gpu', () => {
  testUnsignedPrecisionArray4('gpu');
});

(GPU.isWebGLSupported ? test : skip)('unsigned precision Array(4) webgl', () => {
  testUnsignedPrecisionArray4('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('unsigned precision Array(4) webgl2', () => {
  testUnsignedPrecisionArray4('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('unsigned precision Array(4) headlessgl', () => {
  testUnsignedPrecisionArray4('headlessgl');
});

test('unsigned precision Array(4) cpu', () => {
  testUnsignedPrecisionArray4('cpu');
});
