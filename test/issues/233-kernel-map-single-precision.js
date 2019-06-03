const { assert, skip, test, module: describe, only } = require('qunit');
const { GPU } = require('../../src');

describe('issue # 233');

//TODO: Write for 2D and 3D and textures
//TODO: Write for pipeline as well
function kernelMapSinglePrecision(mode) {
  const lst = [1, 2, 3, 4, 5, 6, 7];
  const gpu = new GPU({ mode });
  const kernels = gpu.createKernelMap({
    stepA: function (x) {
      return x * x;
    },
    stepB: function (x) {
      return x + 1;
    }
  }, function (lst) {
    const val = lst[this.thread.x];

    stepA(val);
    stepB(val);

    return val;
  }, {
    precision: 'single',
    output: [lst.length]
  });

  const result = kernels(lst);
  const unwrap = gpu.createKernel(function(x) {
    return x[this.thread.x];
  }, {
    output: [lst.length],
    precision: 'single',
    optimizeFloatMemory: true,
  });
  const stepAResult = unwrap(result.stepA);
  const stepBResult = unwrap(result.stepB);

  assert.deepEqual(Array.from(stepAResult), lst.map((x) => x * x));
  assert.deepEqual(Array.from(stepBResult), lst.map((x) => x + 1));
  assert.deepEqual(Array.from(result.result), lst);
  gpu.destroy();
}

(GPU.isSinglePrecisionSupported && GPU.isKernelMapSupported ? test : skip)('Issue #233 - kernel map with single precision auto', () => {
  kernelMapSinglePrecision();
});

(GPU.isSinglePrecisionSupported && GPU.isKernelMapSupported ? test : skip)('Issue #233 - kernel map with single precision gpu', () => {
  kernelMapSinglePrecision('gpu');
});

(GPU.isSinglePrecisionSupported && GPU.isWebGLSupported ? test : skip)('Issue #233 - kernel map with single precision webgl', () => {
  kernelMapSinglePrecision('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('Issue #233 - kernel map with single precision webgl2', () => {
  kernelMapSinglePrecision('webgl2');
});

(GPU.isHeadlessGLSupported && GPU.isKernelMapSupported ? test : skip)('Issue #233 - kernel map with single precision headlessgl', () => {
  kernelMapSinglePrecision('headlessgl');
});

test('Issue #233 - kernel map with single precision cpu', () => {
  kernelMapSinglePrecision('cpu');
});


function kernelMapSinglePrecision2D(mode) {
  const lst = [
    [1,2,3],
    [4,5,6],
    [7,8,9]
  ];
  const stepAExpected = [
    [1,4,9],
    [16,25,36],
    [49,64,81],
  ];
  const stepBExpected = [
    [2,3,4],
    [5,6,7],
    [8,9,10]
  ];
  const gpu = new GPU({ mode });
  const kernels = gpu.createKernelMap({
    stepA: function (x) {
      return x * x;
    },
    stepB: function (x) {
      return x + 1;
    }
  }, function (lst) {
    const val = lst[this.thread.y][this.thread.x];

    stepA(val);
    stepB(val);

    return val;
  }, {
    precision: 'single',
    output: [3, 3]
  });

  const result = kernels(lst);
  assert.deepEqual(result.stepA.map(v => Array.from(v)), stepAExpected);
  assert.deepEqual(result.stepB.map(v => Array.from(v)), stepBExpected);
  assert.deepEqual(result.result.map(v => Array.from(v)), lst);
  const memoryOptimize = gpu.createKernel(function(x) {
    return x[this.thread.y][this.thread.x];
  }, {
    output: [3, 3],
    precision: 'single',
    optimizeFloatMemory: true,
  });
  const stepAOptimized = memoryOptimize(result.stepA);
  const stepBOptimized = memoryOptimize(result.stepB);
  const resultOptimized = memoryOptimize(result.result);

  assert.deepEqual(stepAOptimized.map(v => Array.from(v)), stepAExpected);
  assert.deepEqual(stepBOptimized.map(v => Array.from(v)), stepBExpected);
  assert.deepEqual(resultOptimized.map(v => Array.from(v)), lst);
  gpu.destroy();
}

(GPU.isSinglePrecisionSupported && GPU.isKernelMapSupported ? test : skip)('Issue #233 - kernel map with single precision 2d auto', () => {
  kernelMapSinglePrecision2D();
});

(GPU.isSinglePrecisionSupported && GPU.isKernelMapSupported ? test : skip)('Issue #233 - kernel map with single precision 2d gpu', () => {
  kernelMapSinglePrecision2D('gpu');
});

(GPU.isSinglePrecisionSupported && GPU.isWebGLSupported ? test : skip)('Issue #233 - kernel map with single precision 2d webgl', () => {
  kernelMapSinglePrecision2D('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('Issue #233 - kernel map with single precision 2d webgl2', () => {
  kernelMapSinglePrecision2D('webgl2');
});

(GPU.isHeadlessGLSupported && GPU.isKernelMapSupported ? test : skip)('Issue #233 - kernel map with single precision 2d headlessgl', () => {
  kernelMapSinglePrecision2D('headlessgl');
});

test('Issue #233 - kernel map with single precision 2d cpu', () => {
  kernelMapSinglePrecision2D('cpu');
});

function kernelMapSinglePrecision3D(mode) {
  const lst = [
    [
      [1,2,3],
      [4,5,6],
      [7,8,9]
    ],
    [
      [10,11,12],
      [13,14,15],
      [16,17,18]
    ]
  ];
  const stepAExpected = [
    [
      [1,4,9],
      [16,25,36],
      [49,64,81],
    ],
    [
      [100,121,144],
      [169,196,225],
      [256,289,324],
    ]
  ];
  const stepBExpected = [
    [
      [2,3,4],
      [5,6,7],
      [8,9,10]
    ],
    [
      [11,12,13],
      [14,15,16],
      [17,18,19]
    ]
  ];
  const gpu = new GPU({ mode });
  const kernels = gpu.createKernelMap({
    stepA: function (x) {
      return x * x;
    },
    stepB: function (x) {
      return x + 1;
    }
  }, function (lst) {
    const val = lst[this.thread.z][this.thread.y][this.thread.x];

    stepA(val);
    stepB(val);

    return val;
  }, {
    precision: 'single',
    output: [3, 3, 2]
  });

  const result = kernels(lst);
  assert.deepEqual(arrayFromCube(result.stepA), stepAExpected);
  assert.deepEqual(arrayFromCube(result.stepB), stepBExpected);
  assert.deepEqual(arrayFromCube(result.result), lst);
  const memoryOptimize = gpu.createKernel(function(x) {
    return x[this.thread.z][this.thread.y][this.thread.x];
  }, {
    output: [3, 3, 2],
    precision: 'single',
    optimizeFloatMemory: true,
  });
  const stepAOptimized = memoryOptimize(result.stepA);
  const stepBOptimized = memoryOptimize(result.stepB);
  const resultOptimized = memoryOptimize(result.result);

  assert.deepEqual(arrayFromCube(stepAOptimized), stepAExpected);
  assert.deepEqual(arrayFromCube(stepBOptimized), stepBExpected);
  assert.deepEqual(arrayFromCube(resultOptimized), lst);

  function arrayFromCube(cube) {
    return cube.map(matrix => matrix.map(row => Array.from(row)));
  }
  gpu.destroy();
}

(GPU.isSinglePrecisionSupported && GPU.isKernelMapSupported ? test : skip)('Issue #233 - kernel map with single precision 3d auto', () => {
  kernelMapSinglePrecision3D();
});

(GPU.isSinglePrecisionSupported && GPU.isKernelMapSupported ? test : skip)('Issue #233 - kernel map with single precision 3d gpu', () => {
  kernelMapSinglePrecision3D('gpu');
});

(GPU.isSinglePrecisionSupported && GPU.isWebGLSupported ? test : skip)('Issue #233 - kernel map with single precision 3d webgl', () => {
  kernelMapSinglePrecision3D('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('Issue #233 - kernel map with single precision 3d webgl2', () => {
  kernelMapSinglePrecision3D('webgl2');
});

(GPU.isHeadlessGLSupported && GPU.isKernelMapSupported ? test : skip)('Issue #233 - kernel map with single precision 3d headlessgl', () => {
  kernelMapSinglePrecision3D('headlessgl');
});

test('Issue #233 - kernel map with single precision 3d cpu', () => {
  kernelMapSinglePrecision3D('cpu');
});
