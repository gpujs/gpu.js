const { assert, skip, test, only, module: describe } = require('qunit');
const { GPU } = require('../../src');

describe('features: single precision textures');

function singlePrecisionTexturesWithArray(mode) {
  const original = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function(packed) {
    return packed[this.thread.x];
  }, {
    output: [9],
    precision: 'single'
  });

  const result = kernel(original);
  assert.deepEqual(Array.from(result), original);
  gpu.destroy();
}

(GPU.isSinglePrecisionSupported && GPU.isKernelMapSupported ? test : skip)('with Array auto', () => {
  singlePrecisionTexturesWithArray();
});

test('with Array cpu', () => {
  singlePrecisionTexturesWithArray('cpu');
});

(GPU.isSinglePrecisionSupported && GPU.isKernelMapSupported ? test : skip)('with Array gpu', () => {
  singlePrecisionTexturesWithArray('gpu');
});

(GPU.isSinglePrecisionSupported && GPU.isWebGLSupported && GPU.isKernelMapSupported ? test : skip)('with Array webgl', () => {
  singlePrecisionTexturesWithArray('webgl');
});

(GPU.isSinglePrecisionSupported && GPU.isWebGL2Supported ? test : skip)('with Array webgl2', () => {
  singlePrecisionTexturesWithArray('webgl2');
});

(GPU.isSinglePrecisionSupported && GPU.isHeadlessGLSupported && GPU.isKernelMapSupported ? test : skip)('with Array headlessgl', () => {
  singlePrecisionTexturesWithArray('headlessgl');
});

function singlePrecisionTexturesWithFloat32Array(mode) {
  const original = new Float32Array([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function(packed) {
    return packed[this.thread.x];
  }, {
    output: [9],
    precision: 'single'
  });

  const result = kernel(original);
  assert.deepEqual(Array.from(result), Array.from(original));
  gpu.destroy();
}

(GPU.isSinglePrecisionSupported && GPU.isKernelMapSupported ? test : skip)('with Float32Array auto', () => {
  singlePrecisionTexturesWithFloat32Array();
});

test('with Float32Array cpu', () => {
  singlePrecisionTexturesWithFloat32Array('cpu');
});

(GPU.isSinglePrecisionSupported && GPU.isKernelMapSupported ? test : skip)('with Float32Array gpu', () => {
  singlePrecisionTexturesWithFloat32Array('gpu');
});

(GPU.isSinglePrecisionSupported && GPU.isWebGLSupported && GPU.isKernelMapSupported ? test : skip)('with Float32Array webgl', () => {
  singlePrecisionTexturesWithFloat32Array('webgl');
});

(GPU.isSinglePrecisionSupported && GPU.isWebGL2Supported ? test : skip)('with Float32Array webgl2', () => {
  singlePrecisionTexturesWithFloat32Array('webgl2');
});

(GPU.isSinglePrecisionSupported && GPU.isHeadlessGLSupported && GPU.isKernelMapSupported ? test : skip)('with Float32Array headlessgl', () => {
  singlePrecisionTexturesWithFloat32Array('headlessgl');
});

function singlePrecisionTexturesWithUint16Array(mode) {
  const original = new Uint16Array([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function(packed) {
    return packed[this.thread.x];
  }, {
    output: [9],
    precision: 'single',
  });

  const result = kernel(original);
  assert.deepEqual(Array.from(result), Array.from(original));
  gpu.destroy();
}

(GPU.isSinglePrecisionSupported && GPU.isKernelMapSupported ? test : skip)('with Uint16Array auto', () => {
  singlePrecisionTexturesWithUint16Array();
});

test('with Uint16Array cpu', () => {
  singlePrecisionTexturesWithUint16Array('cpu');
});

(GPU.isSinglePrecisionSupported && GPU.isKernelMapSupported ? test : skip)('with Uint16Array gpu', () => {
  singlePrecisionTexturesWithUint16Array('gpu');
});

(GPU.isSinglePrecisionSupported && GPU.isWebGLSupported && GPU.isKernelMapSupported ? test : skip)('with Uint16Array webgl', () => {
  singlePrecisionTexturesWithUint16Array('webgl');
});

(GPU.isSinglePrecisionSupported && GPU.isWebGL2Supported ? test : skip)('with Uint16Array webgl2', () => {
  singlePrecisionTexturesWithUint16Array('webgl2');
});

(GPU.isSinglePrecisionSupported && GPU.isHeadlessGLSupported && GPU.isKernelMapSupported ? test : skip)('with Uint16Array headlessgl', () => {
  singlePrecisionTexturesWithUint16Array('headlessgl');
});

function singlePrecisionTexturesWithUint8Array(mode) {
  const original = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function(packed) {
    return packed[this.thread.x];
  }, {
    output: [9],
    precision: 'single'
  });

  const result = kernel(original);
  assert.deepEqual(Array.from(result), Array.from(original));
  gpu.destroy();
}

(GPU.isSinglePrecisionSupported && GPU.isKernelMapSupported ? test : skip)('with Uint8Array auto', () => {
  singlePrecisionTexturesWithUint8Array();
});

test('with Uint8Array cpu', () => {
  singlePrecisionTexturesWithUint8Array('cpu');
});

(GPU.isSinglePrecisionSupported && GPU.isKernelMapSupported ? test : skip)('with Uint8Array gpu', () => {
  singlePrecisionTexturesWithUint8Array('gpu');
});

(GPU.isSinglePrecisionSupported && GPU.isWebGLSupported && GPU.isKernelMapSupported ? test : skip)('with Uint8Array webgl', () => {
  singlePrecisionTexturesWithUint8Array('webgl');
});

(GPU.isSinglePrecisionSupported && GPU.isWebGL2Supported ? test : skip)('with Uint8Array webgl2', () => {
  singlePrecisionTexturesWithUint8Array('webgl2');
});

(GPU.isSinglePrecisionSupported && GPU.isHeadlessGLSupported && GPU.isKernelMapSupported ? test : skip)('with Uint8Array headlessgl', () => {
  singlePrecisionTexturesWithUint8Array('headlessgl');
});

function singlePrecisionTexturesWithUint8ClampedArray(mode) {
  const original = new Uint8ClampedArray([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function(packed) {
    return packed[this.thread.x];
  }, {
    output: [9],
    precision: 'single'
  });

  const result = kernel(original);
  assert.deepEqual(Array.from(result), Array.from(original));
  gpu.destroy();
}

(GPU.isSinglePrecisionSupported && GPU.isKernelMapSupported ? test : skip)('with Uint8ClampedArray auto', () => {
  singlePrecisionTexturesWithUint8ClampedArray();
});

test('with Uint8ClampedArray cpu', () => {
  singlePrecisionTexturesWithUint8ClampedArray('cpu');
});

(GPU.isSinglePrecisionSupported && GPU.isKernelMapSupported ? test : skip)('with Uint8ClampedArray gpu', () => {
  singlePrecisionTexturesWithUint8ClampedArray('gpu');
});

(GPU.isSinglePrecisionSupported && GPU.isWebGLSupported && GPU.isKernelMapSupported ? test : skip)('with Uint8ClampedArray webgl', () => {
  singlePrecisionTexturesWithUint8ClampedArray('webgl');
});

(GPU.isSinglePrecisionSupported && GPU.isWebGL2Supported ? test : skip)('with Uint8ClampedArray webgl2', () => {
  singlePrecisionTexturesWithUint8ClampedArray('webgl2');
});

(GPU.isSinglePrecisionSupported && GPU.isHeadlessGLSupported && GPU.isKernelMapSupported ? test : skip)('with Uint8ClampedArray headlessgl', () => {
  singlePrecisionTexturesWithUint8ClampedArray('headlessgl');
});

function singlePrecisionTexturesWithArray2D(mode) {
  const original = [
    [1, 2, 3, 4, 5, 6, 7, 8, 9],
    [10, 11, 12, 13, 14, 15, 16, 18, 19],
  ];
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function(packed) {
    return packed[this.thread.y][this.thread.x];
  }, {
    output: [9, 2],
    precision: 'single'
  });

  const result = kernel(original);
  assert.deepEqual(result.map(array => Array.from(array)), original.map(array => Array.from(array)));
  gpu.destroy();
}

(GPU.isSinglePrecisionSupported && GPU.isKernelMapSupported ? test : skip)('with Array2D auto', () => {
  singlePrecisionTexturesWithArray2D();
});

test('with Array2D cpu', () => {
  singlePrecisionTexturesWithArray2D('cpu');
});

(GPU.isSinglePrecisionSupported && GPU.isKernelMapSupported ? test : skip)('with Array2D gpu', () => {
  singlePrecisionTexturesWithArray2D('gpu');
});

(GPU.isSinglePrecisionSupported && GPU.isWebGLSupported && GPU.isKernelMapSupported ? test : skip)('with Array2D webgl', () => {
  singlePrecisionTexturesWithArray2D('webgl');
});

(GPU.isSinglePrecisionSupported && GPU.isWebGL2Supported ? test : skip)('with Array2D webgl2', () => {
  singlePrecisionTexturesWithArray2D('webgl2');
});

(GPU.isSinglePrecisionSupported && GPU.isHeadlessGLSupported && GPU.isKernelMapSupported ? test : skip)('with Array2D headlessgl', () => {
  singlePrecisionTexturesWithArray2D('headlessgl');
});

function singlePrecisionTexturesWithFloat32Array2D(mode) {
  const original = [
    new Float32Array([1, 2, 3, 4, 5, 6, 7, 8, 9]),
    new Float32Array([10, 11, 12, 13, 14, 15, 16, 18, 19]),
  ];
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function(packed) {
    return packed[this.thread.y][this.thread.x];
  }, {
    output: [9, 2],
    precision: 'single'
  });

  const result = kernel(original);
  assert.deepEqual(result.map(array => Array.from(array)), original.map(array => Array.from(array)));
  gpu.destroy();
}

(GPU.isSinglePrecisionSupported && GPU.isKernelMapSupported ? test : skip)('with Float32Array2D auto', () => {
  singlePrecisionTexturesWithFloat32Array2D();
});

test('with Float32Array2D cpu', () => {
  singlePrecisionTexturesWithFloat32Array2D('cpu');
});

(GPU.isSinglePrecisionSupported && GPU.isKernelMapSupported ? test : skip)('with Float32Array2D gpu', () => {
  singlePrecisionTexturesWithFloat32Array2D('gpu');
});

(GPU.isSinglePrecisionSupported && GPU.isWebGLSupported && GPU.isKernelMapSupported ? test : skip)('with Float32Array2D webgl', () => {
  singlePrecisionTexturesWithFloat32Array2D('webgl');
});

(GPU.isSinglePrecisionSupported && GPU.isWebGL2Supported ? test : skip)('with Float32Array2D webgl2', () => {
  singlePrecisionTexturesWithFloat32Array2D('webgl2');
});

(GPU.isSinglePrecisionSupported && GPU.isHeadlessGLSupported && GPU.isKernelMapSupported ? test : skip)('with Float32Array2D headlessgl', () => {
  singlePrecisionTexturesWithFloat32Array2D('headlessgl');
});

function singlePrecisionTexturesWithUint16Array2D(mode) {
  const original = [
    new Uint16Array([1, 2, 3, 4, 5, 6, 7, 8, 9]),
    new Uint16Array([10, 11, 12, 13, 14, 15, 16, 18, 19]),
  ];
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function(packed) {
    return packed[this.thread.y][this.thread.x];
  }, {
    output: [9, 2],
    precision: 'single'
  });

  const result = kernel(original);
  assert.deepEqual(result.map(array => Array.from(array)), original.map(array => Array.from(array)));
  gpu.destroy();
}

(GPU.isSinglePrecisionSupported && GPU.isKernelMapSupported ? test : skip)('with Uint16Array2D auto', () => {
  singlePrecisionTexturesWithUint16Array2D();
});

test('with Uint16Array2D cpu', () => {
  singlePrecisionTexturesWithUint16Array2D('cpu');
});

(GPU.isSinglePrecisionSupported && GPU.isKernelMapSupported ? test : skip)('with Uint16Array2D gpu', () => {
  singlePrecisionTexturesWithUint16Array2D('gpu');
});

(GPU.isSinglePrecisionSupported && GPU.isWebGLSupported && GPU.isKernelMapSupported ? test : skip)('with Uint16Array2D webgl', () => {
  singlePrecisionTexturesWithUint16Array2D('webgl');
});

(GPU.isSinglePrecisionSupported && GPU.isWebGL2Supported ? test : skip)('with Uint16Array2D webgl2', () => {
  singlePrecisionTexturesWithUint16Array2D('webgl2');
});

(GPU.isSinglePrecisionSupported && GPU.isHeadlessGLSupported && GPU.isKernelMapSupported ? test : skip)('with Uint16Array2D headlessgl', () => {
  singlePrecisionTexturesWithUint16Array2D('headlessgl');
});

function singlePrecisionTexturesWithUint8Array2D(mode) {
  const original = [
    new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9]),
    new Uint8Array([10, 11, 12, 13, 14, 15, 16, 18, 19]),
  ];
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function(packed) {
    return packed[this.thread.y][this.thread.x];
  }, {
    output: [9, 2],
    precision: 'single'
  });

  const result = kernel(original);
  assert.deepEqual(result.map(array => Array.from(array)), original.map(array => Array.from(array)));
  gpu.destroy();
}

(GPU.isSinglePrecisionSupported && GPU.isKernelMapSupported ? test : skip)('with Uint8Array2D auto', () => {
  singlePrecisionTexturesWithUint8Array2D();
});

test('with Uint8Array2D cpu', () => {
  singlePrecisionTexturesWithUint8Array2D('cpu');
});

(GPU.isSinglePrecisionSupported && GPU.isKernelMapSupported ? test : skip)('with Uint8Array2D gpu', () => {
  singlePrecisionTexturesWithUint8Array2D('gpu');
});

(GPU.isSinglePrecisionSupported && GPU.isWebGLSupported && GPU.isKernelMapSupported ? test : skip)('with Uint8Array2D webgl', () => {
  singlePrecisionTexturesWithUint8Array2D('webgl');
});

(GPU.isSinglePrecisionSupported && GPU.isWebGL2Supported ? test : skip)('with Uint8Array2D webgl2', () => {
  singlePrecisionTexturesWithUint8Array2D('webgl2');
});

(GPU.isSinglePrecisionSupported && GPU.isHeadlessGLSupported && GPU.isKernelMapSupported ? test : skip)('with Uint8Array2D headlessgl', () => {
  singlePrecisionTexturesWithUint8Array2D('headlessgl');
});

function singlePrecisionTexturesWithUint8ClampedArray2D(mode) {
  const original = [
    new Uint8ClampedArray([1, 2, 3, 4, 5, 6, 7, 8, 9]),
    new Uint8ClampedArray([10, 11, 12, 13, 14, 15, 16, 18, 19]),
  ];
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function(packed) {
    return packed[this.thread.y][this.thread.x];
  }, {
    output: [9, 2],
    precision: 'single'
  });

  const result = kernel(original);
  assert.deepEqual(result.map(array => Array.from(array)), original.map(array => Array.from(array)));
  gpu.destroy();
}

(GPU.isSinglePrecisionSupported && GPU.isKernelMapSupported ? test : skip)('with Uint8ClampedArray2D auto', () => {
  singlePrecisionTexturesWithUint8ClampedArray2D();
});

test('with Uint8ClampedArray2D cpu', () => {
  singlePrecisionTexturesWithUint8ClampedArray2D('cpu');
});

(GPU.isSinglePrecisionSupported && GPU.isKernelMapSupported ? test : skip)('with Uint8ClampedArray2D gpu', () => {
  singlePrecisionTexturesWithUint8ClampedArray2D('gpu');
});

(GPU.isSinglePrecisionSupported && GPU.isWebGLSupported && GPU.isKernelMapSupported ? test : skip)('with Uint8ClampedArray2D webgl', () => {
  singlePrecisionTexturesWithUint8ClampedArray2D('webgl');
});

(GPU.isSinglePrecisionSupported && GPU.isWebGL2Supported ? test : skip)('with Uint8ClampedArray2D webgl2', () => {
  singlePrecisionTexturesWithUint8ClampedArray2D('webgl2');
});

(GPU.isSinglePrecisionSupported && GPU.isHeadlessGLSupported && GPU.isKernelMapSupported ? test : skip)('with Uint8ClampedArray2D headlessgl', () => {
  singlePrecisionTexturesWithUint8ClampedArray2D('headlessgl');
});

function singlePrecisionTexturesWithArray3D(mode) {
  const original = [
    [
      [1, 2, 3, 4, 5, 6, 7, 8, 9],
      [10, 11, 12, 13, 14, 15, 16, 18, 19],
    ],
    [
      [20, 21, 22, 23, 24, 25, 26, 27, 28],
      [29, 30, 31, 32, 33, 34, 35, 36, 37],
    ]
  ];
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function(packed) {
    return packed[this.thread.z][this.thread.y][this.thread.x];
  }, {
    output: [9, 2, 2],
    precision: 'single'
  });

  const result = kernel(original);
  assert.deepEqual(result.map(matrix => matrix.map(array => Array.from(array))), original);
  gpu.destroy();
}

(GPU.isSinglePrecisionSupported && GPU.isKernelMapSupported ? test : skip)('with Array3D auto', () => {
  singlePrecisionTexturesWithArray3D();
});

test('with Array3D cpu', () => {
  singlePrecisionTexturesWithArray3D('cpu');
});

(GPU.isSinglePrecisionSupported && GPU.isKernelMapSupported ? test : skip)('with Array3D gpu', () => {
  singlePrecisionTexturesWithArray3D('gpu');
});

(GPU.isSinglePrecisionSupported && GPU.isWebGLSupported && GPU.isKernelMapSupported ? test : skip)('with Array3D webgl', () => {
  singlePrecisionTexturesWithArray3D('webgl');
});

(GPU.isSinglePrecisionSupported && GPU.isWebGL2Supported ? test : skip)('with Array3D webgl2', () => {
  singlePrecisionTexturesWithArray3D('webgl2');
});

(GPU.isSinglePrecisionSupported && GPU.isHeadlessGLSupported && GPU.isKernelMapSupported ? test : skip)('with Array3D headlessgl', () => {
  singlePrecisionTexturesWithArray3D('headlessgl');
});

function singlePrecisionTexturesWithFloat32Array3D(mode) {
  const original = [
    [
      new Float32Array([1, 2, 3, 4, 5, 6, 7, 8, 9]),
      new Float32Array([10, 11, 12, 13, 14, 15, 16, 18, 19]),
    ],
    [
      new Float32Array([20, 21, 22, 23, 24, 25, 26, 27, 28]),
      new Float32Array([29, 30, 31, 32, 33, 34, 35, 36, 37]),
    ]
  ];
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function(packed) {
    return packed[this.thread.z][this.thread.y][this.thread.x];
  }, {
    output: [9, 2, 2],
    precision: 'single'
  });

  const result = kernel(original);
  assert.deepEqual(result.map(matrix => matrix.map(array => Array.from(array))), original.map(matrix => matrix.map(array => Array.from(array))));
  gpu.destroy();
}

(GPU.isSinglePrecisionSupported && GPU.isKernelMapSupported ? test : skip)('with Float32Array3D auto', () => {
  singlePrecisionTexturesWithFloat32Array3D();
});

test('with Float32Array3D cpu', () => {
  singlePrecisionTexturesWithFloat32Array3D('cpu');
});

(GPU.isSinglePrecisionSupported && GPU.isKernelMapSupported ? test : skip)('with Float32Array3D gpu', () => {
  singlePrecisionTexturesWithFloat32Array3D('gpu');
});

(GPU.isSinglePrecisionSupported && GPU.isWebGLSupported && GPU.isKernelMapSupported ? test : skip)('with Float32Array3D webgl', () => {
  singlePrecisionTexturesWithFloat32Array3D('webgl');
});

(GPU.isSinglePrecisionSupported && GPU.isWebGL2Supported ? test : skip)('with Float32Array3D webgl2', () => {
  singlePrecisionTexturesWithFloat32Array3D('webgl2');
});

(GPU.isSinglePrecisionSupported && GPU.isHeadlessGLSupported && GPU.isKernelMapSupported ? test : skip)('with Float32Array3D headlessgl', () => {
  singlePrecisionTexturesWithFloat32Array3D('headlessgl');
});

function singlePrecisionTexturesWithUint16Array3D(mode) {
  const original = [
    [
      new Uint16Array([1, 2, 3, 4, 5, 6, 7, 8, 9]),
      new Uint16Array([10, 11, 12, 13, 14, 15, 16, 18, 19]),
    ],
    [
      new Uint16Array([20, 21, 22, 23, 24, 25, 26, 27, 28]),
      new Uint16Array([29, 30, 31, 32, 33, 34, 35, 36, 37]),
    ]
  ];
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function(packed) {
    return packed[this.thread.z][this.thread.y][this.thread.x];
  }, {
    output: [9, 2, 2],
    precision: 'single'
  });

  const result = kernel(original);
  assert.deepEqual(result.map(matrix => matrix.map(array => Array.from(array))), original.map(matrix => matrix.map(array => Array.from(array))));
  gpu.destroy();
}

(GPU.isSinglePrecisionSupported && GPU.isKernelMapSupported ? test : skip)('with Uint16Array3D auto', () => {
  singlePrecisionTexturesWithUint16Array3D();
});

test('with Uint16Array3D cpu', () => {
  singlePrecisionTexturesWithUint16Array3D('cpu');
});

(GPU.isSinglePrecisionSupported && GPU.isKernelMapSupported ? test : skip)('with Uint16Array3D gpu', () => {
  singlePrecisionTexturesWithUint16Array3D('gpu');
});

(GPU.isSinglePrecisionSupported && GPU.isWebGLSupported && GPU.isKernelMapSupported ? test : skip)('with Uint16Array3D webgl', () => {
  singlePrecisionTexturesWithUint16Array3D('webgl');
});

(GPU.isSinglePrecisionSupported && GPU.isWebGL2Supported ? test : skip)('with Uint16Array3D webgl2', () => {
  singlePrecisionTexturesWithUint16Array3D('webgl2');
});

(GPU.isSinglePrecisionSupported && GPU.isHeadlessGLSupported && GPU.isKernelMapSupported ? test : skip)('with Uint16Array3D headlessgl', () => {
  singlePrecisionTexturesWithUint16Array3D('headlessgl');
});

function singlePrecisionTexturesWithUint8Array3D(mode) {
  const original = [
    [
      new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9]),
      new Uint8Array([10, 11, 12, 13, 14, 15, 16, 18, 19]),
    ],
    [
      new Uint8Array([20, 21, 22, 23, 24, 25, 26, 27, 28]),
      new Uint8Array([29, 30, 31, 32, 33, 34, 35, 36, 37]),
    ]
  ];
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function(packed) {
    return packed[this.thread.z][this.thread.y][this.thread.x];
  }, {
    output: [9, 2, 2],
    precision: 'single'
  });

  const result = kernel(original);
  assert.deepEqual(result.map(matrix => matrix.map(array => Array.from(array))), original.map(matrix => matrix.map(array => Array.from(array))));
  gpu.destroy();
}

(GPU.isSinglePrecisionSupported && GPU.isKernelMapSupported ? test : skip)('with Uint8Array3D auto', () => {
  singlePrecisionTexturesWithUint8Array3D();
});

test('with Uint8Array3D cpu', () => {
  singlePrecisionTexturesWithUint8Array3D('cpu');
});

(GPU.isSinglePrecisionSupported && GPU.isKernelMapSupported ? test : skip)('with Uint8Array3D gpu', () => {
  singlePrecisionTexturesWithUint8Array3D('gpu');
});

(GPU.isSinglePrecisionSupported && GPU.isWebGLSupported && GPU.isKernelMapSupported ? test : skip)('with Uint8Array3D webgl', () => {
  singlePrecisionTexturesWithUint8Array3D('webgl');
});

(GPU.isSinglePrecisionSupported && GPU.isWebGL2Supported ? test : skip)('with Uint8Array3D webgl2', () => {
  singlePrecisionTexturesWithUint8Array3D('webgl2');
});

(GPU.isSinglePrecisionSupported && GPU.isHeadlessGLSupported && GPU.isKernelMapSupported ? test : skip)('with Uint8Array3D headlessgl', () => {
  singlePrecisionTexturesWithUint8Array3D('headlessgl');
});

function singlePrecisionTexturesWithUint8ClampedArray3D(mode) {
  const original = [
    [
      new Uint8ClampedArray([1, 2, 3, 4, 5, 6, 7, 8, 9]),
      new Uint8ClampedArray([10, 11, 12, 13, 14, 15, 16, 18, 19]),
    ],
    [
      new Uint8ClampedArray([20, 21, 22, 23, 24, 25, 26, 27, 28]),
      new Uint8ClampedArray([29, 30, 31, 32, 33, 34, 35, 36, 37]),
    ]
  ];
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function(packed) {
    return packed[this.thread.z][this.thread.y][this.thread.x];
  }, {
    output: [9, 2, 2],
    precision: 'single'
  });

  const result = kernel(original);
  assert.deepEqual(result.map(matrix => matrix.map(array => Array.from(array))), original.map(matrix => matrix.map(array => Array.from(array))));
  gpu.destroy();
}

(GPU.isSinglePrecisionSupported && GPU.isKernelMapSupported ? test : skip)('with Uint8ClampedArray3D auto', () => {
  singlePrecisionTexturesWithUint8ClampedArray3D();
});

test('with Uint8ClampedArray3D cpu', () => {
  singlePrecisionTexturesWithUint8ClampedArray3D('cpu');
});

(GPU.isSinglePrecisionSupported && GPU.isKernelMapSupported ? test : skip)('with Uint8ClampedArray3D gpu', () => {
  singlePrecisionTexturesWithUint8ClampedArray3D('gpu');
});

(GPU.isSinglePrecisionSupported && GPU.isWebGLSupported && GPU.isKernelMapSupported ? test : skip)('with Uint8ClampedArray3D webgl', () => {
  singlePrecisionTexturesWithUint8ClampedArray3D('webgl');
});

(GPU.isSinglePrecisionSupported && GPU.isWebGL2Supported ? test : skip)('with Uint8ClampedArray3D webgl2', () => {
  singlePrecisionTexturesWithUint8ClampedArray3D('webgl2');
});

(GPU.isSinglePrecisionSupported && GPU.isHeadlessGLSupported && GPU.isKernelMapSupported ? test : skip)('with Uint8ClampedArray3D headlessgl', () => {
  singlePrecisionTexturesWithUint8ClampedArray3D('headlessgl');
});

function testImmutableDoesNotCollideWithKernelTexture(mode) {
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function(v) {
    return v[this.thread.x] + 1;
  }, {
    output: [1],
    precision: 'single',
    pipeline: true,
    immutable: true,
  });
  const v = [1];
  const result1 = kernel(v);
  assert.deepEqual(result1.toArray(), new Float32Array([2]));
  // kernel is getting ready to recompile, because a new type of input
  const result2 = kernel(result1);
  assert.deepEqual(result2.toArray(), new Float32Array([3]));
  // now the kernel textures match, this would fail, and this is that this test is testing
  const result3 = kernel(result2);
  assert.deepEqual(result3.toArray(), new Float32Array([4]));
  gpu.destroy();
}

(GPU.isSinglePrecisionSupported ? test : skip)('immutable does not collide with kernel texture auto', () => {
  testImmutableDoesNotCollideWithKernelTexture();
});

(GPU.isSinglePrecisionSupported ? test : skip)('immutable does not collide with kernel texture gpu', () => {
  testImmutableDoesNotCollideWithKernelTexture('gpu');
});

(GPU.isSinglePrecisionSupported && GPU.isWebGLSupported ? test : skip)('immutable does not collide with kernel texture webgl', () => {
  testImmutableDoesNotCollideWithKernelTexture('webgl');
});

(GPU.isSinglePrecisionSupported && GPU.isWebGL2Supported ? test : skip)('immutable does not collide with kernel texture webgl2', () => {
  testImmutableDoesNotCollideWithKernelTexture('webgl2');
});

(GPU.isSinglePrecisionSupported && GPU.isHeadlessGLSupported ? test : skip)('immutable does not collide with kernel texture headlessgl', () => {
  testImmutableDoesNotCollideWithKernelTexture('headlessgl');
});

