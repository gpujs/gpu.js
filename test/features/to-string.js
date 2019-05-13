const { assert, skip, test, module: describe, only } = require('qunit');
const { GPU, input, Texture } = require('../../src');

//TODO: test all constant types and argument types

describe('features: toString sumAB');
function sumABTestSinglePrecision(mode, context, canvas) {
  const gpu = new GPU({ mode });
  const originalKernel = gpu.createKernel(function(a, b) {
    return a[this.thread.x] + b[this.thread.x];
  }, {
    canvas,
    context,
    output: [6],
    precision: 'single',
  });

  const a = [1, 2, 3, 5, 6, 7];
  const b = [4, 5, 6, 1, 2, 3];
  const expected = [5, 7, 9, 6, 8, 10];
  const originalResult = originalKernel(a, b);
  assert.deepEqual(Array.from(originalResult), expected);
  const kernelString = originalKernel.toString(a, b);
  const newResult = new Function('return ' + kernelString)()(context)(a,b);
  assert.deepEqual(Array.from(newResult), expected);
  gpu.destroy();
}

(GPU.isSinglePrecisionSupported && GPU.isWebGLSupported ? test : skip)('toString sumAB single precision webgl', () => {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('webgl');
  sumABTestSinglePrecision('webgl', context, canvas);
});

(GPU.isSinglePrecisionSupported && GPU.isWebGL2Supported ? test : skip)('toString sumAB single precision webgl2', () => {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('webgl2');
  sumABTestSinglePrecision('webgl2', context, canvas);
});

(GPU.isSinglePrecisionSupported && GPU.isHeadlessGLSupported ? test : skip)('toString sumAB single precision headlessgl', () => {
  sumABTestSinglePrecision('headlessgl', require('gl')(1, 1), null);
});

test('toString sumAB single precision cpu', () => {
  sumABTestSinglePrecision('cpu');
});

function sumABTestUnsignedPrecision(mode, context, canvas) {
  const gpu = new GPU({ mode });
  const originalKernel = gpu.createKernel(function(a, b) {
    return a[this.thread.x] + b[this.thread.x];
  }, {
    canvas,
    context,
    output: [6],
    precision: 'unsigned',
  });

  const a = [1, 2, 3, 5, 6, 7];
  const b = [4, 5, 6, 1, 2, 3];
  const expected = [5, 7, 9, 6, 8, 10];
  const originalResult = originalKernel(a, b);
  assert.deepEqual(Array.from(originalResult), expected);
  const kernelString = originalKernel.toString(a, b);
  const newResult = new Function('return ' + kernelString)()(context)(a,b);
  assert.deepEqual(Array.from(newResult), expected);
  gpu.destroy();
}

(GPU.isWebGLSupported ? test : skip)('toString sumAB unsigned precision webgl', () => {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('webgl');
  sumABTestUnsignedPrecision('webgl', context, canvas);
});

(GPU.isWebGL2Supported ? test : skip)('toString sumAB unsigned precision webgl2', () => {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('webgl2');
  sumABTestUnsignedPrecision('webgl2', context, canvas);
});

(GPU.isHeadlessGLSupported ? test : skip)('toString sumAB unsigned precision headlessgl', () => {
  sumABTestUnsignedPrecision('headlessgl', require('gl')(1, 1), null);
});

test('toString sumAB unsigned precision cpu', () => {
  sumABTestUnsignedPrecision('cpu');
});


describe('features: toString Texture');
function toStringTextureTestSinglePrecision(mode, context, canvas) {
  const gpu = new GPU({ mode, context, canvas });
  const a = [1, 2, 3, 5, 6, 7];
  const expected = [0.5, 1, 1.5, 2.5, 3, 3.5];
  const textureKernel = gpu.createKernel(function(a) {
    return a[this.thread.x] / 2;
  }, {
    output: [6],
    pipeline: true,
    precision: 'single',
  });
  const numberKernel = gpu.createKernel(function(a) {
    return a[this.thread.x];
  }, {
    output: [6],
    precision: 'single',
  });
  const textureResult = textureKernel(a);
  assert.equal(textureResult.constructor, Texture);
  const originalResult = numberKernel(textureResult);
  assert.equal(originalResult.constructor, Float32Array);
  assert.equal(originalResult.length, expected.length);
  for(let i = 0; i < expected.length; ++i) {
    assert.equal(originalResult[i], expected[i], 'Result index: ' + i);
  }
  assert.strictEqual(textureKernel.canvas, numberKernel.canvas);
  assert.strictEqual(textureKernel.context, numberKernel.context);

  const textureKernelString = textureKernel.toString(a);
  const numberKernelString = numberKernel.toString(textureResult);
  const newTextureKernel = new Function('return ' + textureKernelString)()(context);
  const newNumberKernel = new Function('return ' + numberKernelString)()(context);
  const newKernelResult = newTextureKernel(a);
  assert.equal(textureResult.constructor, Texture);
  const newResult = newNumberKernel(newKernelResult);
  assert.equal(newResult.constructor, Float32Array);
  assert.equal(newResult.length, expected.length);
  for(let i = 0; i < expected.length; ++i) {
    assert.equal(newResult[i], expected[i], 'Result index: ' + i);
  }

  gpu.destroy();
}

(GPU.isSinglePrecisionSupported && GPU.isWebGLSupported ? test : skip)('toString Texture single precision webgl', () => {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('webgl');
  toStringTextureTestSinglePrecision('webgl', context, canvas);
});

(GPU.isSinglePrecisionSupported && GPU.isWebGL2Supported ? test : skip)('toString Texture single precision webgl2', () => {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('webgl2');
  toStringTextureTestSinglePrecision('webgl2', context, canvas);
});

(GPU.isSinglePrecisionSupported && GPU.isHeadlessGLSupported ? test : skip)('toString Texture single precision headlessgl', () => {
  toStringTextureTestSinglePrecision('headlessgl', require('gl')(1,1), null);
});

function toStringTextureTestUnsignedPrecision(mode, context, canvas) {
  const gpu = new GPU({ mode, context, canvas });
  const a = [1, 2, 3, 5, 6, 7];
  const expected = [0.5, 1, 1.5, 2.5, 3, 3.5];
  const textureKernel = gpu.createKernel(function(a) {
    return a[this.thread.x] / 2;
  }, {
    output: [6],
    pipeline: true,
    precision: 'unsigned',
  });
  const numberKernel = gpu.createKernel(function(a) {
    return a[this.thread.x];
  }, {
    output: [6],
    precision: 'unsigned',
  });
  const textureResult = textureKernel(a);
  assert.equal(textureResult.constructor, Texture);
  const originalResult = numberKernel(textureResult);
  assert.equal(originalResult.constructor, Float32Array);
  assert.equal(originalResult.length, expected.length);
  for(let i = 0; i < expected.length; ++i) {
    assert.equal(originalResult[i], expected[i], 'Result index: ' + i);
  }
  assert.strictEqual(textureKernel.canvas, numberKernel.canvas);
  assert.strictEqual(textureKernel.context, numberKernel.context);

  const textureKernelString = textureKernel.toString(a);
  const numberKernelString = numberKernel.toString(textureResult);
  const newTextureKernel = new Function('return ' + textureKernelString)()(context);
  const newNumberKernel = new Function('return ' + numberKernelString)()(context);
  const newKernelResult = newTextureKernel(a);
  assert.equal(textureResult.constructor, Texture);
  const newResult = newNumberKernel(newKernelResult);
  assert.equal(newResult.constructor, Float32Array);
  assert.equal(newResult.length, expected.length);
  for(let i = 0; i < expected.length; ++i) {
    assert.equal(newResult[i], expected[i], 'Result index: ' + i);
  }

  gpu.destroy();
}

(GPU.isWebGLSupported ? test : skip)('toString Texture unsigned precision webgl', () => {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('webgl');
  toStringTextureTestUnsignedPrecision('webgl', context, canvas);
});

(GPU.isWebGL2Supported ? test : skip)('toString Texture unsigned precision webgl2', () => {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('webgl2');
  toStringTextureTestUnsignedPrecision('webgl2', context, canvas);
});

(GPU.isHeadlessGLSupported ? test : skip)('toString Texture unsigned precision headlessgl', () => {
  toStringTextureTestUnsignedPrecision('headlessgl', require('gl')(1,1), null);
});

describe('features: toString Input');
function toStringInputTest(mode, context, canvas) {
  const gpu = new GPU({ mode, context, canvas });
  const a = [
    1, 2, 3, 5, 6, 7,
    8, 9,10,11,12,13,
    14,15,16,17,18,19,
    20,21,22,23,24,25,
    26,27,28,29,30,31,
    32,33,34,35,36,37
  ];
  const expected = [24, 63, 99, 135, 171, 207];
  const originalKernel = gpu.createKernel(function(a) {
    let sum = 0;
    for (let i = 0; i < 6; i++) {
      sum += a[this.thread.x][i];
    }
    return sum;
  }, {
    output: [6]
  });
  const originalResult = originalKernel(input(a, [6, 6]));
  assert.deepEqual(Array.from(originalResult), expected);
  const kernelString = originalKernel.toString(input(a, [6, 6]));
  const newKernel = new Function('return ' + kernelString)()(context);
  const newResult = newKernel(input(a, [6, 6]));
  assert.deepEqual(Array.from(newResult), expected);

  gpu.destroy();
}

(GPU.isWebGLSupported ? test : skip)('toString Input webgl', () => {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('webgl');
  toStringInputTest('webgl', context, canvas);
});

(GPU.isWebGL2Supported ? test : skip)('toString Input webgl2', () => {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('webgl2');
  toStringInputTest('webgl2', context, canvas);
});

(GPU.isHeadlessGLSupported ? test : skip)('toString Input headlessgl', () => {
  toStringInputTest('headlessgl', require('gl')(1, 1), null);
});

test('toString Input cpu', () => {
  toStringInputTest('cpu');
});
