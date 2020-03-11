const { assert, skip, test, only, module: describe } = require('qunit');
const { GPU } = require('../../src');

describe('features: unsigned precision textures');

function unsignedPrecisionTexturesWithArray(mode) {
  const original = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function(packed) {
    return packed[this.thread.x];
  }, {
    output: [9],
    precision: 'unsigned'
  });

  const result = kernel(original);
  assert.deepEqual(Array.from(result), original);
  gpu.destroy();
}

(GPU.isKernelMapSupported ? test : skip)('with Array auto', () => {
  unsignedPrecisionTexturesWithArray();
});

test('with Array cpu', () => {
  unsignedPrecisionTexturesWithArray('cpu');
});

(GPU.isKernelMapSupported ? test : skip)('with Array gpu', () => {
  unsignedPrecisionTexturesWithArray('gpu');
});

(GPU.isWebGLSupported && GPU.isKernelMapSupported ? test : skip)('with Array webgl', () => {
  unsignedPrecisionTexturesWithArray('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('with Array webgl2', () => {
  unsignedPrecisionTexturesWithArray('webgl2');
});

(GPU.isHeadlessGLSupported && GPU.isKernelMapSupported ? test : skip)('with Array headlessgl', () => {
  unsignedPrecisionTexturesWithArray('headlessgl');
});

function unsignedPrecisionTexturesWithFloat32Array(mode) {
  const original = new Float32Array([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function(packed) {
    return packed[this.thread.x];
  }, {
    output: [9],
    precision: 'unsigned'
  });

  const result = kernel(original);
  assert.deepEqual(Array.from(result), Array.from(original));
  gpu.destroy();
}

(GPU.isKernelMapSupported ? test : skip)('with Float32Array auto', () => {
  unsignedPrecisionTexturesWithFloat32Array();
});

test('with Float32Array cpu', () => {
  unsignedPrecisionTexturesWithFloat32Array('cpu');
});

(GPU.isKernelMapSupported ? test : skip)('with Float32Array gpu', () => {
  unsignedPrecisionTexturesWithFloat32Array('gpu');
});

(GPU.isWebGLSupported && GPU.isKernelMapSupported ? test : skip)('with Float32Array webgl', () => {
  unsignedPrecisionTexturesWithFloat32Array('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('with Float32Array webgl2', () => {
  unsignedPrecisionTexturesWithFloat32Array('webgl2');
});

(GPU.isHeadlessGLSupported && GPU.isKernelMapSupported ? test : skip)('with Float32Array headlessgl', () => {
  unsignedPrecisionTexturesWithFloat32Array('headlessgl');
});

function unsignedPrecisionTexturesWithUint16Array(mode) {
  const original = new Uint16Array([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function(packed) {
    return packed[this.thread.x];
  }, {
    output: [9],
    precision: 'unsigned',
  });

  const result = kernel(original);
  assert.deepEqual(Array.from(result), Array.from(original));
  gpu.destroy();
}

(GPU.isKernelMapSupported ? test : skip)('with Uint16Array auto', () => {
  unsignedPrecisionTexturesWithUint16Array();
});

test('with Uint16Array cpu', () => {
  unsignedPrecisionTexturesWithUint16Array('cpu');
});

(GPU.isKernelMapSupported ? test : skip)('with Uint16Array gpu', () => {
  unsignedPrecisionTexturesWithUint16Array('gpu');
});

(GPU.isWebGLSupported && GPU.isKernelMapSupported ? test : skip)('with Uint16Array webgl', () => {
  unsignedPrecisionTexturesWithUint16Array('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('with Uint16Array webgl2', () => {
  unsignedPrecisionTexturesWithUint16Array('webgl2');
});

(GPU.isHeadlessGLSupported && GPU.isKernelMapSupported ? test : skip)('with Uint16Array headlessgl', () => {
  unsignedPrecisionTexturesWithUint16Array('headlessgl');
});

function unsignedPrecisionTexturesWithUint8Array(mode) {
  const original = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function(packed) {
    return packed[this.thread.x];
  }, {
    output: [9],
    precision: 'unsigned'
  });

  const result = kernel(original);
  assert.deepEqual(Array.from(result), Array.from(original));
  gpu.destroy();
}

(GPU.isKernelMapSupported ? test : skip)('with Uint8Array auto', () => {
  unsignedPrecisionTexturesWithUint8Array();
});

test('with Uint8Array cpu', () => {
  unsignedPrecisionTexturesWithUint8Array('cpu');
});

(GPU.isKernelMapSupported ? test : skip)('with Uint8Array gpu', () => {
  unsignedPrecisionTexturesWithUint8Array('gpu');
});

(GPU.isWebGLSupported && GPU.isKernelMapSupported ? test : skip)('with Uint8Array webgl', () => {
  unsignedPrecisionTexturesWithUint8Array('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('with Uint8Array webgl2', () => {
  unsignedPrecisionTexturesWithUint8Array('webgl2');
});

(GPU.isHeadlessGLSupported && GPU.isKernelMapSupported ? test : skip)('with Uint8Array headlessgl', () => {
  unsignedPrecisionTexturesWithUint8Array('headlessgl');
});

function unsignedPrecisionTexturesWithUint8ClampedArray(mode) {
  const original = new Uint8ClampedArray([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function(packed) {
    return packed[this.thread.x];
  }, {
    output: [9],
    precision: 'unsigned'
  });

  const result = kernel(original);
  assert.deepEqual(Array.from(result), Array.from(original));
  gpu.destroy();
}

(GPU.isKernelMapSupported ? test : skip)('with Uint8ClampedArray auto', () => {
  unsignedPrecisionTexturesWithUint8ClampedArray();
});

test('with Uint8ClampedArray cpu', () => {
  unsignedPrecisionTexturesWithUint8ClampedArray('cpu');
});

(GPU.isKernelMapSupported ? test : skip)('with Uint8ClampedArray gpu', () => {
  unsignedPrecisionTexturesWithUint8ClampedArray('gpu');
});

(GPU.isWebGLSupported && GPU.isKernelMapSupported ? test : skip)('with Uint8ClampedArray webgl', () => {
  unsignedPrecisionTexturesWithUint8ClampedArray('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('with Uint8ClampedArray webgl2', () => {
  unsignedPrecisionTexturesWithUint8ClampedArray('webgl2');
});

(GPU.isHeadlessGLSupported && GPU.isKernelMapSupported ? test : skip)('with Uint8ClampedArray headlessgl', () => {
  unsignedPrecisionTexturesWithUint8ClampedArray('headlessgl');
});

function unsignedPrecisionTexturesWithArray2D(mode) {
  const original = [
    [1, 2, 3, 4, 5, 6, 7, 8, 9],
    [10, 11, 12, 13, 14, 15, 16, 18, 19],
  ];
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function(packed) {
    return packed[this.thread.y][this.thread.x];
  }, {
    output: [9, 2],
    precision: 'unsigned'
  });

  const result = kernel(original);
  assert.deepEqual(result.map(array => Array.from(array)), original.map(array => Array.from(array)));
  gpu.destroy();
}

(GPU.isKernelMapSupported ? test : skip)('with Array2D auto', () => {
  unsignedPrecisionTexturesWithArray2D();
});

test('with Array2D cpu', () => {
  unsignedPrecisionTexturesWithArray2D('cpu');
});

(GPU.isKernelMapSupported ? test : skip)('with Array2D gpu', () => {
  unsignedPrecisionTexturesWithArray2D('gpu');
});

(GPU.isWebGLSupported && GPU.isKernelMapSupported ? test : skip)('with Array2D webgl', () => {
  unsignedPrecisionTexturesWithArray2D('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('with Array2D webgl2', () => {
  unsignedPrecisionTexturesWithArray2D('webgl2');
});

(GPU.isHeadlessGLSupported && GPU.isKernelMapSupported ? test : skip)('with Array2D headlessgl', () => {
  unsignedPrecisionTexturesWithArray2D('headlessgl');
});

function unsignedPrecisionTexturesWithFloat32Array2D(mode) {
  const original = [
    new Float32Array([1, 2, 3, 4, 5, 6, 7, 8, 9]),
    new Float32Array([10, 11, 12, 13, 14, 15, 16, 18, 19]),
  ];
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function(packed) {
    return packed[this.thread.y][this.thread.x];
  }, {
    output: [9, 2],
    precision: 'unsigned'
  });

  const result = kernel(original);
  assert.deepEqual(result.map(array => Array.from(array)), original.map(array => Array.from(array)));
  gpu.destroy();
}

(GPU.isKernelMapSupported ? test : skip)('with Float32Array2D auto', () => {
  unsignedPrecisionTexturesWithFloat32Array2D();
});

test('with Float32Array2D cpu', () => {
  unsignedPrecisionTexturesWithFloat32Array2D('cpu');
});

(GPU.isKernelMapSupported ? test : skip)('with Float32Array2D gpu', () => {
  unsignedPrecisionTexturesWithFloat32Array2D('gpu');
});

(GPU.isWebGLSupported && GPU.isKernelMapSupported ? test : skip)('with Float32Array2D webgl', () => {
  unsignedPrecisionTexturesWithFloat32Array2D('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('with Float32Array2D webgl2', () => {
  unsignedPrecisionTexturesWithFloat32Array2D('webgl2');
});

(GPU.isHeadlessGLSupported && GPU.isKernelMapSupported ? test : skip)('with Float32Array2D headlessgl', () => {
  unsignedPrecisionTexturesWithFloat32Array2D('headlessgl');
});

function unsignedPrecisionTexturesWithUint16Array2D(mode) {
  const original = [
    new Uint16Array([1, 2, 3, 4, 5, 6, 7, 8, 9]),
    new Uint16Array([10, 11, 12, 13, 14, 15, 16, 18, 19]),
  ];
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function(packed) {
    return packed[this.thread.y][this.thread.x];
  }, {
    output: [9, 2],
    precision: 'unsigned'
  });

  const result = kernel(original);
  assert.deepEqual(result.map(array => Array.from(array)), original.map(array => Array.from(array)));
  gpu.destroy();
}

(GPU.isKernelMapSupported ? test : skip)('with Uint16Array2D auto', () => {
  unsignedPrecisionTexturesWithUint16Array2D();
});

test('with Uint16Array2D cpu', () => {
  unsignedPrecisionTexturesWithUint16Array2D('cpu');
});

(GPU.isKernelMapSupported ? test : skip)('with Uint16Array2D gpu', () => {
  unsignedPrecisionTexturesWithUint16Array2D('gpu');
});

(GPU.isWebGLSupported && GPU.isKernelMapSupported ? test : skip)('with Uint16Array2D webgl', () => {
  unsignedPrecisionTexturesWithUint16Array2D('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('with Uint16Array2D webgl2', () => {
  unsignedPrecisionTexturesWithUint16Array2D('webgl2');
});

(GPU.isHeadlessGLSupported && GPU.isKernelMapSupported ? test : skip)('with Uint16Array2D headlessgl', () => {
  unsignedPrecisionTexturesWithUint16Array2D('headlessgl');
});

function unsignedPrecisionTexturesWithUint8Array2D(mode) {
  const original = [
    new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9]),
    new Uint8Array([10, 11, 12, 13, 14, 15, 16, 18, 19]),
  ];
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function(packed) {
    return packed[this.thread.y][this.thread.x];
  }, {
    output: [9, 2],
    precision: 'unsigned'
  });

  const result = kernel(original);
  assert.deepEqual(result.map(array => Array.from(array)), original.map(array => Array.from(array)));
  gpu.destroy();
}

(GPU.isKernelMapSupported ? test : skip)('with Uint8Array2D auto', () => {
  unsignedPrecisionTexturesWithUint8Array2D();
});

test('with Uint8Array2D cpu', () => {
  unsignedPrecisionTexturesWithUint8Array2D('cpu');
});

(GPU.isKernelMapSupported ? test : skip)('with Uint8Array2D gpu', () => {
  unsignedPrecisionTexturesWithUint8Array2D('gpu');
});

(GPU.isWebGLSupported && GPU.isKernelMapSupported ? test : skip)('with Uint8Array2D webgl', () => {
  unsignedPrecisionTexturesWithUint8Array2D('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('with Uint8Array2D webgl2', () => {
  unsignedPrecisionTexturesWithUint8Array2D('webgl2');
});

(GPU.isHeadlessGLSupported && GPU.isKernelMapSupported ? test : skip)('with Uint8Array2D headlessgl', () => {
  unsignedPrecisionTexturesWithUint8Array2D('headlessgl');
});

function unsignedPrecisionTexturesWithUint8ClampedArray2D(mode) {
  const original = [
    new Uint8ClampedArray([1, 2, 3, 4, 5, 6, 7, 8, 9]),
    new Uint8ClampedArray([10, 11, 12, 13, 14, 15, 16, 18, 19]),
  ];
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function(packed) {
    return packed[this.thread.y][this.thread.x];
  }, {
    output: [9, 2],
    precision: 'unsigned'
  });

  const result = kernel(original);
  assert.deepEqual(result.map(array => Array.from(array)), original.map(array => Array.from(array)));
  gpu.destroy();
}

(GPU.isKernelMapSupported ? test : skip)('with Uint8ClampedArray2D auto', () => {
  unsignedPrecisionTexturesWithUint8ClampedArray2D();
});

test('with Uint8ClampedArray2D cpu', () => {
  unsignedPrecisionTexturesWithUint8ClampedArray2D('cpu');
});

(GPU.isKernelMapSupported ? test : skip)('with Uint8ClampedArray2D gpu', () => {
  unsignedPrecisionTexturesWithUint8ClampedArray2D('gpu');
});

(GPU.isWebGLSupported && GPU.isKernelMapSupported ? test : skip)('with Uint8ClampedArray2D webgl', () => {
  unsignedPrecisionTexturesWithUint8ClampedArray2D('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('with Uint8ClampedArray2D webgl2', () => {
  unsignedPrecisionTexturesWithUint8ClampedArray2D('webgl2');
});

(GPU.isHeadlessGLSupported && GPU.isKernelMapSupported ? test : skip)('with Uint8ClampedArray2D headlessgl', () => {
  unsignedPrecisionTexturesWithUint8ClampedArray2D('headlessgl');
});

function unsignedPrecisionTexturesWithArray3D(mode) {
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
    precision: 'unsigned'
  });

  const result = kernel(original);
  assert.deepEqual(result.map(matrix => matrix.map(array => Array.from(array))), original);
  gpu.destroy();
}

(GPU.isKernelMapSupported ? test : skip)('with Array3D auto', () => {
  unsignedPrecisionTexturesWithArray3D();
});

test('with Array3D cpu', () => {
  unsignedPrecisionTexturesWithArray3D('cpu');
});

(GPU.isKernelMapSupported ? test : skip)('with Array3D gpu', () => {
  unsignedPrecisionTexturesWithArray3D('gpu');
});

(GPU.isWebGLSupported && GPU.isKernelMapSupported ? test : skip)('with Array3D webgl', () => {
  unsignedPrecisionTexturesWithArray3D('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('with Array3D webgl2', () => {
  unsignedPrecisionTexturesWithArray3D('webgl2');
});

(GPU.isHeadlessGLSupported && GPU.isKernelMapSupported ? test : skip)('with Array3D headlessgl', () => {
  unsignedPrecisionTexturesWithArray3D('headlessgl');
});

function unsignedPrecisionTexturesWithFloat32Array3D(mode) {
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
    precision: 'unsigned'
  });

  const result = kernel(original);
  assert.deepEqual(result.map(matrix => matrix.map(array => Array.from(array))), original.map(matrix => matrix.map(array => Array.from(array))));
  gpu.destroy();
}

(GPU.isKernelMapSupported ? test : skip)('with Float32Array3D auto', () => {
  unsignedPrecisionTexturesWithFloat32Array3D();
});

test('with Float32Array3D cpu', () => {
  unsignedPrecisionTexturesWithFloat32Array3D('cpu');
});

(GPU.isKernelMapSupported ? test : skip)('with Float32Array3D gpu', () => {
  unsignedPrecisionTexturesWithFloat32Array3D('gpu');
});

(GPU.isWebGLSupported && GPU.isKernelMapSupported ? test : skip)('with Float32Array3D webgl', () => {
  unsignedPrecisionTexturesWithFloat32Array3D('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('with Float32Array3D webgl2', () => {
  unsignedPrecisionTexturesWithFloat32Array3D('webgl2');
});

(GPU.isHeadlessGLSupported && GPU.isKernelMapSupported ? test : skip)('with Float32Array3D headlessgl', () => {
  unsignedPrecisionTexturesWithFloat32Array3D('headlessgl');
});

function unsignedPrecisionTexturesWithUint16Array3D(mode) {
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
    precision: 'unsigned'
  });

  const result = kernel(original);
  assert.deepEqual(result.map(matrix => matrix.map(array => Array.from(array))), original.map(matrix => matrix.map(array => Array.from(array))));
  gpu.destroy();
}

(GPU.isKernelMapSupported ? test : skip)('with Uint16Array3D auto', () => {
  unsignedPrecisionTexturesWithUint16Array3D();
});

test('with Uint16Array3D cpu', () => {
  unsignedPrecisionTexturesWithUint16Array3D('cpu');
});

(GPU.isKernelMapSupported ? test : skip)('with Uint16Array3D gpu', () => {
  unsignedPrecisionTexturesWithUint16Array3D('gpu');
});

(GPU.isWebGLSupported && GPU.isKernelMapSupported ? test : skip)('with Uint16Array3D webgl', () => {
  unsignedPrecisionTexturesWithUint16Array3D('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('with Uint16Array3D webgl2', () => {
  unsignedPrecisionTexturesWithUint16Array3D('webgl2');
});

(GPU.isHeadlessGLSupported && GPU.isKernelMapSupported ? test : skip)('with Uint16Array3D headlessgl', () => {
  unsignedPrecisionTexturesWithUint16Array3D('headlessgl');
});

function unsignedPrecisionTexturesWithUint8Array3D(mode) {
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
    precision: 'unsigned'
  });

  const result = kernel(original);
  assert.deepEqual(result.map(matrix => matrix.map(array => Array.from(array))), original.map(matrix => matrix.map(array => Array.from(array))));
  gpu.destroy();
}

(GPU.isKernelMapSupported ? test : skip)('with Uint8Array3D auto', () => {
  unsignedPrecisionTexturesWithUint8Array3D();
});

test('with Uint8Array3D cpu', () => {
  unsignedPrecisionTexturesWithUint8Array3D('cpu');
});

(GPU.isKernelMapSupported ? test : skip)('with Uint8Array3D gpu', () => {
  unsignedPrecisionTexturesWithUint8Array3D('gpu');
});

(GPU.isWebGLSupported && GPU.isKernelMapSupported ? test : skip)('with Uint8Array3D webgl', () => {
  unsignedPrecisionTexturesWithUint8Array3D('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('with Uint8Array3D webgl2', () => {
  unsignedPrecisionTexturesWithUint8Array3D('webgl2');
});

(GPU.isHeadlessGLSupported && GPU.isKernelMapSupported ? test : skip)('with Uint8Array3D headlessgl', () => {
  unsignedPrecisionTexturesWithUint8Array3D('headlessgl');
});

function unsignedPrecisionTexturesWithUint8ClampedArray3D(mode) {
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
    precision: 'unsigned'
  });

  const result = kernel(original);
  assert.deepEqual(result.map(matrix => matrix.map(array => Array.from(array))), original.map(matrix => matrix.map(array => Array.from(array))));
  gpu.destroy();
}

(GPU.isKernelMapSupported ? test : skip)('with Uint8ClampedArray3D auto', () => {
  unsignedPrecisionTexturesWithUint8ClampedArray3D();
});

test('with Uint8ClampedArray3D cpu', () => {
  unsignedPrecisionTexturesWithUint8ClampedArray3D('cpu');
});

(GPU.isKernelMapSupported ? test : skip)('with Uint8ClampedArray3D gpu', () => {
  unsignedPrecisionTexturesWithUint8ClampedArray3D('gpu');
});

(GPU.isWebGLSupported && GPU.isKernelMapSupported ? test : skip)('with Uint8ClampedArray3D webgl', () => {
  unsignedPrecisionTexturesWithUint8ClampedArray3D('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('with Uint8ClampedArray3D webgl2', () => {
  unsignedPrecisionTexturesWithUint8ClampedArray3D('webgl2');
});

(GPU.isHeadlessGLSupported && GPU.isKernelMapSupported ? test : skip)('with Uint8ClampedArray3D headlessgl', () => {
  unsignedPrecisionTexturesWithUint8ClampedArray3D('headlessgl');
});

function testImmutableDoesNotCollideWithKernelTexture(mode) {
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function(v) {
    return v[this.thread.x] + 1;
  }, {
    output: [1],
    precision: 'unsigned',
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

test('immutable does not collide with kernel texture auto', () => {
  testImmutableDoesNotCollideWithKernelTexture();
});

test('immutable does not collide with kernel texture gpu', () => {
  testImmutableDoesNotCollideWithKernelTexture('gpu');
});

(GPU.isWebGLSupported ? test : skip)('immutable does not collide with kernel texture webgl', () => {
  testImmutableDoesNotCollideWithKernelTexture('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('immutable does not collide with kernel texture webgl2', () => {
  testImmutableDoesNotCollideWithKernelTexture('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('immutable does not collide with kernel texture headlessgl', () => {
  testImmutableDoesNotCollideWithKernelTexture('headlessgl');
});
