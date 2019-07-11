const { assert, skip, test, module: describe, only } = require('qunit');
const { GPU, input } = require('../../src');

describe('input');

function inputX(mode) {
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function(a) {
    return a[this.thread.x];
  })
    .setOutput([9]);

  const a = new Float32Array(9);
  a.set([1,2,3,4,5,6,7,8,9]);

  const result = kernel(input(a, [3, 3]));
  assert.deepEqual(Array.from(result), [1,2,3,4,5,6,7,8,9]);
  gpu.destroy();
}

test("inputX auto", () => {
  inputX();
});

test("inputX gpu", () => {
  inputX('gpu');
});

(GPU.isWebGLSupported ? test : skip)("inputX webgl", () => {
  inputX('webgl');
});

(GPU.isWebGL2Supported ? test : skip)("inputX webgl2", () => {
  inputX('webgl2');
});

test("inputX cpu", () => {
  inputX('cpu');
});


function inputXY(mode) {
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function(a) {
    return a[this.thread.y][this.thread.x];
  })
    .setOutput([9]);

  const a = new Float32Array(9);
  a.set([1,2,3,4,5,6,7,8,9]);

  const b = new Float32Array(9);
  b.set([1,2,3,4,5,6,7,8,9]);

  const result = kernel(input(a, [3, 3]));
  assert.deepEqual(Array.from(result), [1,2,3,4,5,6,7,8,9]);
  gpu.destroy();
}

test("inputXY auto", () => {
  inputXY();
});

test("inputXY gpu", () => {
  inputXY('gpu');
});

(GPU.isWebGLSupported ? test : skip)("inputXY webgl", () => {
  inputXY('webgl');
});

(GPU.isWebGL2Supported ? test : skip)("inputXY webgl2", () => {
  inputXY('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)("inputXY headlessgl", () => {
  inputXY('headlessgl');
});

test("inputXY cpu", () => {
  inputXY('cpu');
});

function inputYX(mode) {
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function(a) {
    return a[this.thread.y][this.thread.x];
  })
    .setOutput([3, 3]);

  const a = new Float32Array(9);
  a.set([1,2,3,4,5,6,7,8,9]);

  const result = kernel(input(a, [3, 3]));
  assert.deepEqual(result.map(function(v) { return Array.from(v); }), [[1,2,3],[4,5,6],[7,8,9]]);
  gpu.destroy();
}

test("inputYX auto", () => {
  inputYX();
});

test("inputYX gpu", () => {
  inputYX('gpu');
});

(GPU.isWebGLSupported ? test : skip)("inputYX webgl", () => {
  inputYX('webgl');
});

(GPU.isWebGL2Supported ? test : skip)("inputYX webgl2", () => {
  inputYX('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)("inputYX headlessgl", () => {
  inputYX('headlessgl');
});

test("inputYX cpu", () => {
  inputYX('cpu');
});

function inputYXOffset(mode) {
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function(a) {
    return a[this.thread.x][this.thread.y];
  })
    .setOutput([8, 2]);

  const a = new Float32Array(16);
  a.set([1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16]);

  const result = kernel(input(a, [2, 8]));
  assert.deepEqual(result.map(function(v) { return Array.from(v); }), [[1,3,5,7,9,11,13,15],[2,4,6,8,10,12,14,16]]);
  gpu.destroy();
}

test("inputYXOffset auto", () => {
  inputYXOffset();
});

test("inputYXOffset gpu", () => {
  inputYXOffset('gpu');
});

(GPU.isWebGLSupported ? test : skip)("inputYXOffset webgl", () => {
  inputYXOffset('webgl');
});

(GPU.isWebGL2Supported ? test : skip)("inputYXOffset webgl2", () => {
  inputYXOffset('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)("inputYXOffset headlessgl", () => {
  inputYXOffset('headlessgl');
});

test("inputYXOffset cpu", () => {
  inputYXOffset('cpu');
});

function inputYXOffsetPlus1(mode) {
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function(a) {
    return a[this.thread.x][this.thread.y];
  })
    .setOutput([2, 8]);

  const a = new Float32Array([1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16]);

  const result = kernel(input(a, [8, 2]));
  assert.deepEqual(result.map(function(v) { return Array.from(v); }), [[1,9],[2,10],[3,11],[4,12],[5,13],[6,14],[7,15],[8,16]]);
  gpu.destroy();
}

test("inputYXOffsetPlus1 auto", () => {
  inputYXOffsetPlus1();
});

test("inputYXOffsetPlus1 gpu", () => {
  inputYXOffsetPlus1('gpu');
});

(GPU.isWebGLSupported ? test : skip)("inputYXOffsetPlus1 webgl", () => {
  inputYXOffsetPlus1('webgl');
});

(GPU.isWebGL2Supported ? test : skip)("inputYXOffsetPlus1 webgl2", () => {
  inputYXOffsetPlus1('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)("inputYXOffsetPlus1 headlessgl", () => {
  inputYXOffsetPlus1('headlessgl');
});

test("inputYXOffsetPlus1 cpu", () => {
  inputYXOffsetPlus1('cpu');
});

function inputZYX(mode) {
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function(a) {
    return a[this.thread.z][this.thread.y][this.thread.x];
  })
    .setOutput([2, 4, 4]);

  const a = new Float32Array(32);
  a.set([1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32]);

  const result = kernel(input(a, [2, 4, 4]));
  assert.deepEqual(result.map(function(v) { return v.map(function(v) { return Array.from(v); }); }), [[[1,2],[3,4],[5,6],[7,8]],[[9,10],[11,12],[13,14],[15,16]],[[17,18],[19,20],[21,22],[23,24]],[[25,26],[27,28],[29,30],[31,32]]]);
  gpu.destroy();
}

test("inputZYX auto", () => {
  inputZYX();
});

test("inputZYX gpu", () => {
  inputZYX('gpu');
});

(GPU.isWebGLSupported ? test : skip)("inputZYX webgl", () => {
  inputZYX('webgl');
});

(GPU.isWebGL2Supported ? test : skip)("inputZYX webgl2", () => {
  inputZYX('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)("inputZYX headlessgl", () => {
  inputZYX('headlessgl');
});

test("inputZYX cpu", () => {
  inputZYX('cpu');
});


function inputZYXVariables(mode) {
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function(a, x, y, z) {
    return a[z][y][x];
  })
    .setOutput([1]);

  const a = new Float32Array(32);
  a.set([1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32]);
  const aInput = input(a, [2, 4, 4]);
  assert.deepEqual(Array.from(kernel(aInput, 1, 2, 3)), [30]);
  assert.deepEqual(Array.from(kernel(aInput, 0, 2, 3)), [29]);
  assert.deepEqual(Array.from(kernel(aInput, 0, 2, 1)), [13]);
  assert.deepEqual(Array.from(kernel(aInput, 1, 2, 2)), [22]);
  assert.deepEqual(Array.from(kernel(aInput, 0, 2, 2)), [21]);
  gpu.destroy();
}

test("inputZYXVariables auto", () => {
  inputZYXVariables();
});

test("inputZYXVariables gpu", () => {
  inputZYXVariables('gpu');
});

(GPU.isWebGLSupported ? test : skip)("inputZYXVariables webgl", () => {
  inputZYXVariables('webgl');
});

(GPU.isWebGL2Supported ? test : skip)("inputZYXVariables webgl2", () => {
  inputZYXVariables('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)("inputZYXVariables headlessgl", () => {
  inputZYXVariables('headlessgl');
});

test("inputZYXVariables cpu", () => {
  inputZYXVariables('cpu');
});

function inputInt32ArrayX(mode) {
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function(a) {
    return a[this.thread.x];
  })
    .setPrecision('unsigned')
    .setOutput([9]);

  const a = new Int32Array([1,2,3,4,5,6,7,8,9]);
  const result = kernel(input(a, [3, 3]));
  assert.deepEqual(result, new Float32Array([1,2,3,4,5,6,7,8,9]));
  gpu.destroy();
}

test("inputInt32ArrayX auto", () => {
  inputInt32ArrayX();
});

test("inputInt32ArrayX gpu", () => {
  inputInt32ArrayX('gpu');
});

(GPU.isWebGLSupported ? test : skip)("inputInt32ArrayX webgl", () => {
  inputInt32ArrayX('webgl');
});

(GPU.isWebGL2Supported ? test : skip)("inputInt32ArrayX webgl2", () => {
  inputInt32ArrayX('webgl2');
});

test("inputInt32ArrayX cpu", () => {
  inputInt32ArrayX('cpu');
});

test('.toArray() with array', () => {
  assert.deepEqual(input([1,2,3,4], [4]).toArray(), [1,2,3,4]);
});
test('.toArray() with matrix', () => {
  assert.deepEqual(input([1,2,3,4,5,6,7,8], [4,2]).toArray(), [new Float32Array([1,2,3,4]), new Float32Array([5,6,7,8])]);
});
test('.toArray() with grid', () => {
  assert.deepEqual(
    input([1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16], [4,2,2]).toArray(),
    [
      [
        new Float32Array([1,2,3,4]),
        new Float32Array([5,6,7,8]),
      ],
      [
        new Float32Array([9,10,11,12]),
        new Float32Array([13,14,15,16])
      ]
    ]
  );
});
