const { assert, skip, test, module: describe, only } = require('qunit');
const { GPU, Input, input, Texture } = require('../../src');

describe('features: toString sumAB');
function sumABTest(mode) {
  const gpu = new GPU({ mode });
  const originalKernel = gpu.createKernel(function(a, b) {
    return a[this.thread.x] + b[this.thread.x];
  }, {
    output : [6]
  });

  const a = [1, 2, 3, 5, 6, 7];
  const b = [4, 5, 6, 1, 2, 3];
  const expected = [5, 7, 9, 6, 8, 10];
  const originalResult = originalKernel(a,b);
  assert.deepEqual(Array.from(originalResult), expected);
  const kernelString = originalKernel.toString();
  const newKernel = new Function('return ' + kernelString)()();
  newKernel
    .setContext(originalKernel.context)
    .setCanvas(originalKernel.canvas);
  const newResult = newKernel(a,b);
  assert.deepEqual(Array.from(newResult), expected);
  gpu.destroy();
}

test('toString sumAB auto', () => {
  sumABTest(null);
});

(GPU.isGPUSupported ? test : skip)('toString sumAB gpu', () => {
  sumABTest('gpu');
});

(GPU.isWebGLSupported ? test : skip)('toString sumAB webgl', () => {
  sumABTest('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('toString sumAB webgl2', () => {
  sumABTest('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('toString sumAB headlessgl', () => {
  sumABTest('headlessgl');
});

test('toString sumAB cpu', () => {
  sumABTest('cpu');
});


describe('features: toString Texture');
function toStringTextureTest(mode) {
  const gpu = new GPU({ mode });
  const a = [1, 2, 3, 5, 6, 7];
  const expected = [0.5, 1, 1.5, 2.5, 3, 3.5];
  const textureKernel = gpu.createKernel(function(a) {
    return a[this.thread.x] / 2;
  }, {
    output: [6],
    pipeline: true
  });
  const numberKernel = gpu.createKernel(function(a) {
    return a[this.thread.x];
  }, {
    output: [6]
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

  const textureKernelString = textureKernel.toString();
  const numberKernelString = numberKernel.toString();
  const newTextureKernel = new Function('return ' + textureKernelString)()();
  const newNumberKernel = new Function('return ' + numberKernelString)()();
  const canvas = textureKernel.canvas;
  const context = textureKernel.context;
  newTextureKernel
    .setTexture(Texture)
    .setContext(context)
    .setCanvas(canvas);
  newNumberKernel
    .setTexture(Texture)
    .setContext(context)
    .setCanvas(canvas);

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

test('toString Texture auto', () => {
  toStringTextureTest();
});

test('toString Texture gpu', () => {
  toStringTextureTest('gpu');
});

(GPU.isWebGLSupported ? test : skip)('toString Texture webgl', () => {
  toStringTextureTest('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('toString Texture webgl2', () => {
  toStringTextureTest('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('toString Texture headlessgl', () => {
  toStringTextureTest('headlessgl');
});

describe('features: toString Input');
function toStringInputTest(mode) {
  const gpu = new GPU({ mode });
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
  const kernelString = originalKernel.toString();
  const newKernel = new Function('return ' + kernelString)()();
  const canvas = originalKernel.canvas;
  const context = originalKernel.context;
  newKernel
    .setInput(Input)
    .setContext(context)
    .setCanvas(canvas);

  const newResult = newKernel(input(a, [6, 6]));
  assert.deepEqual(Array.from(newResult), expected);

  gpu.destroy();
}

test('toString Input auto', () => {
  toStringInputTest();
});

test('toString Input gpu', () => {
  toStringInputTest('gpu');
});

(GPU.isWebGLSupported ? test : skip)('toString Input webgl', () => {
  toStringInputTest('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('toString Input webgl2', () => {
  toStringInputTest('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('toString Input headlessgl', () => {
  toStringInputTest('headlessgl');
});

test('toString Input cpu', () => {
  toStringInputTest('cpu');
});
