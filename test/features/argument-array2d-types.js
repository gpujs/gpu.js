const { assert, skip, test, module: describe, only } = require('qunit');
const { GPU } = require('../../src');

describe('argument array 2 types');

function testSinglePrecisionArray2D2(mode) {
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function(value) {
    return value[this.thread.y][this.thread.x];
  }, {
    output: [4, 2],
    argumentTypes: { value: 'Array2D(2)' },
    precision: 'single',
  });
  const value = [
    [
      new Float32Array([1,2]),
      new Float32Array([3,4]),
      new Float32Array([5,6]),
      new Float32Array([7,8]),
    ], [
      new Float32Array([9,10]),
      new Float32Array([11,12]),
      new Float32Array([13,14]),
      new Float32Array([15,16]),
    ]
  ];
  const result = kernel(value);
  assert.deepEqual(result, value);
  gpu.destroy();
}

(GPU.isSinglePrecisionSupported ? test : skip)('single precision Array2D(2) auto', () => {
  testSinglePrecisionArray2D2();
});

(GPU.isSinglePrecisionSupported ? test : skip)('single precision Array2D(2) gpu', () => {
  testSinglePrecisionArray2D2('gpu');
});

(GPU.isSinglePrecisionSupported && GPU.isWebGLSupported ? test : skip)('single precision Array2D(2) webgl', () => {
  testSinglePrecisionArray2D2('webgl');
});

(GPU.isSinglePrecisionSupported && GPU.isWebGL2Supported ? test : skip)('single precision Array2D(2) webgl2', () => {
  testSinglePrecisionArray2D2('webgl2');
});

(GPU.isSinglePrecisionSupported && GPU.isHeadlessGLSupported ? test : skip)('single precision Array2D(2) headlessgl', () => {
  testSinglePrecisionArray2D2('headlessgl');
});

test('single precision Array2D(2) cpu', () => {
  testSinglePrecisionArray2D2('cpu');
});

function testUnsignedPrecisionArray2D2(mode) {
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function(value) {
    return value[this.thread.y][this.thread.x];
  }, {
    output: [4, 2],
    argumentTypes: { value: 'Array2D(2)' },
    precision: 'unsigned',
  });
  const value = [
    [
      new Float32Array([1,2]),
      new Float32Array([3,4]),
      new Float32Array([5,6]),
      new Float32Array([7,8]),
    ], [
      new Float32Array([9,10]),
      new Float32Array([11,12]),
      new Float32Array([13,14]),
      new Float32Array([15,16]),
    ]
  ];
  const result = kernel(value);
  assert.deepEqual(result, value);
  gpu.destroy();
}

test('fallback unsigned precision Array2D(2) auto', () => {
  testUnsignedPrecisionArray2D2();
});

test('fallback unsigned precision Array2D(2) gpu', () => {
  testUnsignedPrecisionArray2D2('gpu');
});

(GPU.isWebGLSupported ? test : skip)('fallback unsigned precision Array2D(2) webgl', () => {
  testUnsignedPrecisionArray2D2('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('fallback unsigned precision Array2D(2) webgl2', () => {
  testUnsignedPrecisionArray2D2('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('fallback unsigned precision Array(2) headlessgl', () => {
  testUnsignedPrecisionArray2D2('headlessgl');
});

test('fallback unsigned precision Array2D(2) cpu', () => {
  testUnsignedPrecisionArray2D2('cpu');
});

function testSinglePrecisionArray2D3(mode) {
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function(value) {
    return value[this.thread.y][this.thread.x];
  }, {
    output: [4, 2],
    argumentTypes: { value: 'Array2D(3)' },
    precision: 'single',
  });
  const value = [
    [
      new Float32Array([1,2,3]),
      new Float32Array([4,5,6]),
      new Float32Array([7,8,9]),
      new Float32Array([10,11,12]),
    ], [
      new Float32Array([13,14,15]),
      new Float32Array([16,17,18]),
      new Float32Array([19,20,21]),
      new Float32Array([22,23,25]),
    ]
  ];
  const result = kernel(value);
  assert.deepEqual(result, value);
  gpu.destroy();
}

(GPU.isSinglePrecisionSupported ? test : skip)('single precision Array2D(3) auto', () => {
  testSinglePrecisionArray2D3();
});

(GPU.isSinglePrecisionSupported ? test : skip)('single precision Array2D(3) gpu', () => {
  testSinglePrecisionArray2D3('gpu');
});

(GPU.isSinglePrecisionSupported && GPU.isWebGLSupported ? test : skip)('single precision Array2D(3) webgl', () => {
  testSinglePrecisionArray2D3('webgl');
});

(GPU.isSinglePrecisionSupported && GPU.isWebGL2Supported ? test : skip)('single precision Array2D(3) webgl2', () => {
  testSinglePrecisionArray2D3('webgl2');
});

(GPU.isSinglePrecisionSupported && GPU.isHeadlessGLSupported ? test : skip)('single precision Array2D(3) headlessgl', () => {
  testSinglePrecisionArray2D3('headlessgl');
});

test('single precision Array2D(3) cpu', () => {
  testSinglePrecisionArray2D3('cpu');
});

function testUnsignedPrecisionArray2D3(mode) {
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function(value) {
    return value[this.thread.y][this.thread.x];
  }, {
    output: [4, 2],
    argumentTypes: { value: 'Array2D(3)' },
    precision: 'unsigned',
  });
  const value = [
    [
      new Float32Array([1,2,3]),
      new Float32Array([4,5,6]),
      new Float32Array([7,8,9]),
      new Float32Array([10,11,12]),
    ], [
      new Float32Array([13,14,15]),
      new Float32Array([16,17,18]),
      new Float32Array([19,20,21]),
      new Float32Array([22,23,25]),
    ]
  ];
  const result = kernel(value);
  assert.deepEqual(result, value);
  gpu.destroy();
}

test('fallback unsigned precision Array2D(3) auto', () => {
  testUnsignedPrecisionArray2D3();
});

test('fallback unsigned precision Array2D(3) gpu', () => {
  testUnsignedPrecisionArray2D3('gpu');
});

(GPU.isWebGLSupported ? test : skip)('fallback unsigned precision Array2D(3) webgl', () => {
  testUnsignedPrecisionArray2D3('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('fallback unsigned precision Array2D(3) webgl2', () => {
  testUnsignedPrecisionArray2D3('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('fallback unsigned precision Array(3) headlessgl', () => {
  testUnsignedPrecisionArray2D3('headlessgl');
});

test('fallback unsigned precision Array2D(3) cpu', () => {
  testUnsignedPrecisionArray2D3('cpu');
});

function testSinglePrecisionArray2D4(mode) {
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function(value) {
    return value[this.thread.y][this.thread.x];
  }, {
    output: [4, 2],
    argumentTypes: { value: 'Array2D(4)' },
    precision: 'single',
  });
  const value = [
    [
      new Float32Array([1,2,3,4]),
      new Float32Array([5,6,7,8]),
      new Float32Array([9,10,11,12]),
      new Float32Array([13,14,15,16]),
    ], [
      new Float32Array([17,18,19,20]),
      new Float32Array([21,22,23,24]),
      new Float32Array([25,26,27,28]),
      new Float32Array([29,30,31,32]),
    ]
  ];
  const result = kernel(value);
  assert.deepEqual(result, value);
  gpu.destroy();
}

(GPU.isSinglePrecisionSupported ? test : skip)('single precision Array2D(4) auto', () => {
  testSinglePrecisionArray2D4();
});

(GPU.isSinglePrecisionSupported ? test : skip)('single precision Array2D(4) gpu', () => {
  testSinglePrecisionArray2D4('gpu');
});

(GPU.isSinglePrecisionSupported && GPU.isWebGLSupported ? test : skip)('single precision Array2D(4) webgl', () => {
  testSinglePrecisionArray2D4('webgl');
});

(GPU.isSinglePrecisionSupported && GPU.isWebGL2Supported ? test : skip)('single precision Array2D(4) webgl2', () => {
  testSinglePrecisionArray2D4('webgl2');
});

(GPU.isSinglePrecisionSupported && GPU.isHeadlessGLSupported ? test : skip)('single precision Array2D(4) headlessgl', () => {
  testSinglePrecisionArray2D4('headlessgl');
});

test('single precision Array2D(4) cpu', () => {
  testSinglePrecisionArray2D4('cpu');
});

function testUnsignedPrecisionArray2D4(mode) {
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function(value) {
    return value[this.thread.y][this.thread.x];
  }, {
    output: [4, 2],
    argumentTypes: { value: 'Array2D(4)' },
    precision: 'unsigned',
  });
  const value = [
    [
      new Float32Array([1,2,3,4]),
      new Float32Array([5,6,7,8]),
      new Float32Array([9,10,11,12]),
      new Float32Array([13,14,15,16]),
    ], [
      new Float32Array([17,18,19,20]),
      new Float32Array([21,22,23,24]),
      new Float32Array([25,26,27,28]),
      new Float32Array([29,30,31,32]),
    ]
  ];
  const result = kernel(value);
  assert.deepEqual(result, value);
  gpu.destroy();
}

test('fallback unsigned precision Array2D(4) auto', () => {
  testUnsignedPrecisionArray2D4();
});

test('fallback unsigned precision Array2D(4) gpu', () => {
  testUnsignedPrecisionArray2D4('gpu');
});

(GPU.isWebGLSupported ? test : skip)('fallback unsigned precision Array2D(4) webgl', () => {
  testUnsignedPrecisionArray2D4('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('fallback unsigned precision Array2D(4) webgl2', () => {
  testUnsignedPrecisionArray2D4('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('fallback unsigned precision Array(4) headlessgl', () => {
  testUnsignedPrecisionArray2D4('headlessgl');
});

test('fallback unsigned precision Array2D(4) cpu', () => {
  testUnsignedPrecisionArray2D4('cpu');
});
