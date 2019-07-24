const { assert, skip, test, module: describe, only } = require('qunit');
const { GPU } = require('../../src');

describe('argument array 3 types');

function testSinglePrecisionArray3D2(mode) {
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function(value) {
    return value[this.thread.z][this.thread.y][this.thread.x];
  }, {
    output: [2,2,3],
    argumentTypes: { value: 'Array3D(2)' },
    precision: 'single',
  });
  const value = [
    [
      [
        new Float32Array([1,2]),
        new Float32Array([3,4]),
      ],[
      new Float32Array([5,6]),
      new Float32Array([7,8]),
    ]
    ],[
      [
        new Float32Array([9,10]),
        new Float32Array([11,12]),
      ],[
        new Float32Array([13,14]),
        new Float32Array([15,16]),
      ]
    ],[
      [
        new Float32Array([17,18]),
        new Float32Array([19,20]),
      ],[
        new Float32Array([21,22]),
        new Float32Array([23,24]),
      ]
    ]
  ];
  const result = kernel(value);
  assert.deepEqual(result, value);
  gpu.destroy();
}

(GPU.isSinglePrecisionSupported ? test : skip)('single precision Array3D(2) auto', () => {
  testSinglePrecisionArray3D2();
});

(GPU.isSinglePrecisionSupported ? test : skip)('single precision Array3D(2) gpu', () => {
  testSinglePrecisionArray3D2('gpu');
});

(GPU.isSinglePrecisionSupported && GPU.isWebGLSupported ? test : skip)('single precision Array3D(2) webgl', () => {
  testSinglePrecisionArray3D2('webgl');
});

(GPU.isSinglePrecisionSupported && GPU.isWebGL2Supported ? test : skip)('single precision Array3D(2) webgl2', () => {
  testSinglePrecisionArray3D2('webgl2');
});

(GPU.isSinglePrecisionSupported && GPU.isHeadlessGLSupported ? test : skip)('single precision Array3D(2) headlessgl', () => {
  testSinglePrecisionArray3D2('headlessgl');
});

test('single precision Array3D(2) cpu', () => {
  testSinglePrecisionArray3D2('cpu');
});

function testUnsignedPrecisionArray3D2(mode) {
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function(value) {
    return value[this.thread.z][this.thread.y][this.thread.x];
  }, {
    output: [2,2,3],
    argumentTypes: { value: 'Array2D(2)' },
    precision: 'unsigned',
  });
  const value = [
    [
      [
        new Float32Array([1,2]),
        new Float32Array([3,4]),
      ],[
      new Float32Array([5,6]),
      new Float32Array([7,8]),
    ]
    ],[
      [
        new Float32Array([9,10]),
        new Float32Array([11,12]),
      ],[
        new Float32Array([13,14]),
        new Float32Array([15,16]),
      ]
    ],[
      [
        new Float32Array([17,18]),
        new Float32Array([19,20]),
      ],[
        new Float32Array([21,22]),
        new Float32Array([23,24]),
      ]
    ]
  ];
  const result = kernel(value);
  assert.deepEqual(result, value);
  gpu.destroy();
}

test('fallback unsigned precision Array3D(3) auto', () => {
  testUnsignedPrecisionArray3D2();
});

test('fallback unsigned precision Array3D(3) gpu', () => {
  testUnsignedPrecisionArray3D2('gpu');
});

(GPU.isWebGLSupported ? test : skip)('fallback unsigned precision Array3D(3) webgl', () => {
  testUnsignedPrecisionArray3D2('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('fallback unsigned precision Array3D(3) webgl2', () => {
  testUnsignedPrecisionArray3D2('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('fallback unsigned precision Array3D(3) headlessgl', () => {
  testUnsignedPrecisionArray3D2('headlessgl');
});

test('fallback unsigned precision Array3D(3) cpu', () => {
  testUnsignedPrecisionArray3D2('cpu');
});

function testSinglePrecisionArray3D3(mode) {
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function(value) {
    return value[this.thread.z][this.thread.y][this.thread.x];
  }, {
    output: [2,2,3],
    argumentTypes: { value: 'Array3D(3)' },
    precision: 'single',
  });
  const value = [
    [
      [
        new Float32Array([1,2,3]),
        new Float32Array([4,5,6]),
      ],[
        new Float32Array([7,8,9]),
        new Float32Array([10,11,12]),
      ]
    ],[
      [
        new Float32Array([13,14,15]),
        new Float32Array([16,17,18]),
      ],[
        new Float32Array([19,20,21]),
        new Float32Array([22,23,24]),
      ]
    ],[
      [
        new Float32Array([25,26,27]),
        new Float32Array([28,29,30]),
      ],[
        new Float32Array([31,32,33]),
        new Float32Array([34,35,36]),
      ]
    ]
  ];
  const result = kernel(value);
  assert.deepEqual(result, value);
  gpu.destroy();
}

(GPU.isSinglePrecisionSupported ? test : skip)('single precision Array3D(3) auto', () => {
  testSinglePrecisionArray3D3();
});

(GPU.isSinglePrecisionSupported ? test : skip)('single precision Array3D(3) gpu', () => {
  testSinglePrecisionArray3D3('gpu');
});

(GPU.isSinglePrecisionSupported && GPU.isWebGLSupported ? test : skip)('single precision Array3D(3) webgl', () => {
  testSinglePrecisionArray3D3('webgl');
});

(GPU.isSinglePrecisionSupported && GPU.isWebGL2Supported ? test : skip)('single precision Array3D(3) webgl2', () => {
  testSinglePrecisionArray3D3('webgl2');
});

(GPU.isSinglePrecisionSupported && GPU.isHeadlessGLSupported ? test : skip)('single precision Array3D(3) headlessgl', () => {
  testSinglePrecisionArray3D3('headlessgl');
});

test('single precision Array3D(3) cpu', () => {
  testSinglePrecisionArray3D3('cpu');
});

function testUnsignedPrecisionArray3D3(mode) {
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function(value) {
    return value[this.thread.z][this.thread.y][this.thread.x];
  }, {
    output: [2,2,3],
    argumentTypes: { value: 'Array2D(3)' },
    precision: 'unsigned',
  });
  const value = [
    [
      [
        new Float32Array([1,2,3]),
        new Float32Array([4,5,6]),
      ],[
      new Float32Array([7,8,9]),
      new Float32Array([10,11,12]),
    ]
    ],[
      [
        new Float32Array([13,14,15]),
        new Float32Array([16,17,18]),
      ],[
        new Float32Array([19,20,21]),
        new Float32Array([22,23,24]),
      ]
    ],[
      [
        new Float32Array([25,26,27]),
        new Float32Array([28,29,30]),
      ],[
        new Float32Array([31,32,33]),
        new Float32Array([34,35,36]),
      ]
    ]
  ];
  const result = kernel(value);
  assert.deepEqual(result, value);
  gpu.destroy();
}

test('fallback unsigned precision Array3D(3) auto', () => {
  testUnsignedPrecisionArray3D3();
});

test('fallback unsigned precision Array3D(3) gpu', () => {
  testUnsignedPrecisionArray3D3('gpu');
});

(GPU.isWebGLSupported ? test : skip)('fallback unsigned precision Array3D(3) webgl', () => {
  testUnsignedPrecisionArray3D3('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('fallback unsigned precision Array3D(3) webgl2', () => {
  testUnsignedPrecisionArray3D3('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('fallback unsigned precision Array3D(3) headlessgl', () => {
  testUnsignedPrecisionArray3D3('headlessgl');
});

test('fallback unsigned precision Array3D(3) cpu', () => {
  testUnsignedPrecisionArray3D3('cpu');
});

function testSinglePrecisionArray3D4(mode) {
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function(value) {
    return value[this.thread.z][this.thread.y][this.thread.x];
  }, {
    output: [2,2,3],
    argumentTypes: { value: 'Array3D(4)' },
    precision: 'single',
  });
  const value = [
    [
      [
        new Float32Array([1,2,3,4]),
        new Float32Array([5,6,7,8]),
      ],[
        new Float32Array([9,10,11,12]),
        new Float32Array([13,14,15,16]),
      ]
    ],[
      [
        new Float32Array([17,18,19,20]),
        new Float32Array([21,22,23,24]),
      ],[
        new Float32Array([25,26,27,28]),
        new Float32Array([29,30,31,32]),
      ]
    ],[
      [
        new Float32Array([33,34,35,36]),
        new Float32Array([37,38,39,40]),
      ],[
        new Float32Array([41,42,43,44]),
        new Float32Array([45,46,47,48]),
      ]
    ]
  ];
  const result = kernel(value);
  assert.deepEqual(result, value);
  gpu.destroy();
}

(GPU.isSinglePrecisionSupported ? test : skip)('single precision Array3D(4) auto', () => {
  testSinglePrecisionArray3D4();
});

(GPU.isSinglePrecisionSupported ? test : skip)('single precision Array3D(4) gpu', () => {
  testSinglePrecisionArray3D4('gpu');
});

(GPU.isSinglePrecisionSupported && GPU.isWebGLSupported ? test : skip)('single precision Array3D(4) webgl', () => {
  testSinglePrecisionArray3D4('webgl');
});

(GPU.isSinglePrecisionSupported && GPU.isWebGL2Supported ? test : skip)('single precision Array3D(4) webgl2', () => {
  testSinglePrecisionArray3D4('webgl2');
});

(GPU.isSinglePrecisionSupported && GPU.isHeadlessGLSupported ? test : skip)('single precision Array3D(4) headlessgl', () => {
  testSinglePrecisionArray3D4('headlessgl');
});

test('single precision Array3D(4) cpu', () => {
  testSinglePrecisionArray3D4('cpu');
});

function testUnsignedPrecisionArray3D4(mode) {
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function(value) {
    return value[this.thread.z][this.thread.y][this.thread.x];
  }, {
    output: [2,2,3],
    argumentTypes: { value: 'Array2D(3)' },
    precision: 'unsigned',
  });
  const value = [
    [
      [
        new Float32Array([1,2,3,4]),
        new Float32Array([5,6,7,8]),
      ],[
        new Float32Array([9,10,11,12]),
        new Float32Array([13,14,15,16]),
      ]
    ],[
      [
        new Float32Array([17,18,19,20]),
        new Float32Array([21,22,23,24]),
      ],[
        new Float32Array([25,26,27,28]),
        new Float32Array([29,30,31,32]),
      ]
    ],[
      [
        new Float32Array([33,34,35,36]),
        new Float32Array([37,38,39,40]),
      ],[
        new Float32Array([41,42,43,44]),
        new Float32Array([45,46,47,48]),
      ]
    ]
  ];
  const result = kernel(value);
  assert.deepEqual(result, value);
  gpu.destroy();
}

test('fallback unsigned precision Array3D(4) auto', () => {
  testUnsignedPrecisionArray3D4();
});

test('fallback unsigned precision Array3D(4) gpu', () => {
  testUnsignedPrecisionArray3D4('gpu');
});

(GPU.isWebGLSupported ? test : skip)('fallback unsigned precision Array3D(4) webgl', () => {
  testUnsignedPrecisionArray3D4('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('fallback unsigned precision Array3D(4) webgl2', () => {
  testUnsignedPrecisionArray3D4('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('fallback unsigned precision Array3D(4) headlessgl', () => {
  testUnsignedPrecisionArray3D4('headlessgl');
});

test('fallback unsigned precision Array3D(4) cpu', () => {
  testUnsignedPrecisionArray3D4('cpu');
});
