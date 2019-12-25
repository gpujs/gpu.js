const { assert, skip, test, module: describe, only } = require('qunit');
const { GPU } = require('../../src');

describe('internal: matrix multiply precision');

function vanillaMatrixMultiply(a, b) {
  const width = a.length;
  const height = b.length;
  const result = new Array(height);
  for (let y = 0; y < height; y++) {
    const row = new Float32Array(width);
    for (let x = 0; x < width; x++) {
      let sum = 0;
      for (let i = 0; i < width; i++) {
        sum += a[y][i] * b[i][x];
      }
      row[x] = sum;
    }
    result[y] = row;
  }
  return result;
}

function filledMatrix(width, height) {
  const matrix = new Array(height);
  for (let y = 0; y < height; y++) {
    const row = matrix[y] = new Float32Array(width);
    for (let x = 0; x < width; x++) {
      row[x] = Math.random() * 10;
    }
  }
  return matrix;
}

function test512x512Matrix(precision, mode) {
  const width = 512;
  const height = 512;
  const a = filledMatrix(width, height);
  const b = filledMatrix(width, height);
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function(a, b) {
    let sum = 0;
    for (let i = 0; i < this.constants.width; i++) {
      sum += a[this.thread.y][i] * b[i][this.thread.x];
    }
    return sum;
  }, {
    output: [width, height],
    precision,
    constants: {
      width
    }
  });
  const cpuResult = vanillaMatrixMultiply(a, b, width, height);
  const gpuResult = kernel(a, b);
  let closeEnough = true;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const singleGPUResult = gpuResult[y][x];
      const singleCPUResult = cpuResult[y][x];
      if (Math.abs(singleGPUResult - singleCPUResult) > 1) {
        closeEnough = false;
        break;
      }
    }
  }
  assert.ok(closeEnough);
  gpu.destroy();
}

test('512x512 unsigned precision auto', () => {
  test512x512Matrix('unsigned');
});

test('512x512 unsigned precision gpu', () => {
  test512x512Matrix('unsigned', 'gpu');
});

(GPU.isWebGLSupported ? test : skip)('512x512 unsigned precision webgl', () => {
  test512x512Matrix('unsigned', 'webgl');
});

(GPU.isWebGL2Supported ? test : skip)('512x512 unsigned precision webgl2', () => {
  test512x512Matrix('unsigned', 'webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('512x512 unsigned precision headlessgl', () => {
  test512x512Matrix('unsigned', 'headlessgl');
});

test('512x512 unsigned precision cpu', () => {
  test512x512Matrix('unsigned', 'cpu');
});

function test10x512Matrix(precision, mode) {
  const width = 10;
  const height = 512;
  const a = filledMatrix(width, height);
  const b = filledMatrix(width, height);
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function(a, b) {
    let sum = 0;
    for (let i = 0; i < this.constants.width; i++) {
      sum += a[this.thread.y][i] * b[i][this.thread.x];
    }
    return sum;
  }, {
    output: [width, height],
    precision,
    constants: {
      width
    }
  });
  const cpuResult = vanillaMatrixMultiply(a, b, width, height);
  const gpuResult = kernel(a, b);
  let closeEnough = true;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const singleGPUResult = gpuResult[y][x];
      const singleCPUResult = cpuResult[y][x];
      if (Math.abs(singleGPUResult - singleCPUResult) > 1) {
        closeEnough = false;
        break;
      }
    }
  }
  assert.ok(closeEnough);
  gpu.destroy();
}

test('10x512 unsigned precision auto', () => {
  test10x512Matrix('unsigned');
});

test('10x512 unsigned precision gpu', () => {
  test10x512Matrix('unsigned', 'gpu');
});

(GPU.isWebGLSupported ? test : skip)('10x512 unsigned precision webgl', () => {
  test10x512Matrix('unsigned', 'webgl');
});

(GPU.isWebGL2Supported ? test : skip)('10x512 unsigned precision webgl2', () => {
  test10x512Matrix('unsigned', 'webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('10x512 unsigned precision headlessgl', () => {
  test10x512Matrix('unsigned', 'headlessgl');
});

test('10x512 unsigned precision cpu', () => {
  test10x512Matrix('unsigned', 'cpu');
});

(GPU.isSinglePrecisionSupported ? test : skip)('512x512 single precision auto', () => {
  test512x512Matrix('single');
});

(GPU.isSinglePrecisionSupported ? test : skip)('512x512 single precision gpu', () => {
  test512x512Matrix('single', 'gpu');
});

(GPU.isWebGLSupported && GPU.isSinglePrecisionSupported ? test : skip)('512x512 single precision webgl', () => {
  test512x512Matrix('single', 'webgl');
});

(GPU.isWebGL2Supported && GPU.isSinglePrecisionSupported ? test : skip)('512x512 single precision webgl2', () => {
  test512x512Matrix('single', 'webgl2');
});

(GPU.isHeadlessGLSupported && GPU.isSinglePrecisionSupported ? test : skip)('512x512 single precision headlessgl', () => {
  test512x512Matrix('single', 'headlessgl');
});

test('512x512 single precision cpu', () => {
  test512x512Matrix('single', 'cpu');
});


(GPU.isSinglePrecisionSupported ? test : skip)('10x512 single precision auto', () => {
  test10x512Matrix('single');
});

(GPU.isSinglePrecisionSupported ? test : skip)('10x512 single precision gpu', () => {
  test10x512Matrix('single', 'gpu');
});

(GPU.isWebGLSupported && GPU.isSinglePrecisionSupported ? test : skip)('10x512 single precision webgl', () => {
  test10x512Matrix('single', 'webgl');
});

(GPU.isWebGL2Supported && GPU.isSinglePrecisionSupported ? test : skip)('10x512 single precision webgl2', () => {
  test10x512Matrix('single', 'webgl2');
});

(GPU.isHeadlessGLSupported && GPU.isSinglePrecisionSupported ? test : skip)('10x512 single precision headlessgl', () => {
  test10x512Matrix('single', 'headlessgl');
});

test('10x512 single precision cpu', () => {
  test10x512Matrix('precision', 'cpu');
});
