const { assert, skip, test, module: describe, only } = require('qunit');
const { GPU } = require('../../src');

describe('features: internally defined matrices');

function testMatrix2(mode) {
  const gpu = new GPU({ mode });
  function getMatrix() {
    const matrix = [
      [1,2],
      [3,4]
    ];
    return matrix;
  }
  gpu.addFunction(getMatrix);
  const kernel = gpu.createKernel(function(y, x) {
    return getMatrix()[y][x];
  }, { output: [1] });

  assert.equal(kernel(0, 0)[0], 1);
  assert.equal(kernel(0, 1)[0], 2);
  assert.equal(kernel(1, 0)[0], 3);
  assert.equal(kernel(1, 1)[0], 4);

  gpu.destroy();
}

test('matrix2 auto', () => {
  testMatrix2();
});

test('matrix2 gpu', () => {
  testMatrix2('gpu');
});

(GPU.isWebGLSupported ? test : skip)('matrix2 webgl', () => {
  testMatrix2('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('matrix2 webgl2', () => {
  testMatrix2('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('matrix2 headlessgl', () => {
  testMatrix2('headlessgl');
});

test('matrix2 cpu', () => {
  testMatrix2('cpu');
});

function testMatrix3(mode) {
  const gpu = new GPU({ mode });
  function getMatrix() {
    const matrix = [
      [1,2,3],
      [4,5,6],
      [7,8,9],
    ];
    return matrix;
  }
  gpu.addFunction(getMatrix);
  const kernel = gpu.createKernel(function(y, x) {
    return getMatrix()[y][x];
  }, { output: [1] });

  assert.equal(kernel(0, 0)[0], 1);
  assert.equal(kernel(0, 1)[0], 2);
  assert.equal(kernel(0, 2)[0], 3);
  assert.equal(kernel(1, 0)[0], 4);
  assert.equal(kernel(1, 1)[0], 5);
  assert.equal(kernel(1, 2)[0], 6);
  assert.equal(kernel(2, 0)[0], 7);
  assert.equal(kernel(2, 1)[0], 8);
  assert.equal(kernel(2, 2)[0], 9);

  gpu.destroy();
}

test('matrix3 auto', () => {
  testMatrix3();
});

test('matrix3 gpu', () => {
  testMatrix3('gpu');
});

(GPU.isWebGLSupported ? test : skip)('matrix3 webgl', () => {
  testMatrix3('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('matrix3 webgl2', () => {
  testMatrix3('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('matrix3 headlessgl', () => {
  testMatrix3('headlessgl');
});

test('matrix3 cpu', () => {
  testMatrix3('cpu');
});

function testMatrix4(mode) {
  const gpu = new GPU({ mode });
  function getMatrix() {
    const matrix = [
      [1,2,3,4],
      [5,6,7,8],
      [9,10,11,12],
      [13,14,15,16],
    ];
    return matrix;
  }
  gpu.addFunction(getMatrix);
  const kernel = gpu.createKernel(function(y, x) {
    return getMatrix()[y][x];
  }, { output: [1] });

  assert.equal(kernel(0, 0)[0], 1);
  assert.equal(kernel(0, 1)[0], 2);
  assert.equal(kernel(0, 2)[0], 3);
  assert.equal(kernel(0, 3)[0], 4);
  assert.equal(kernel(1, 0)[0], 5);
  assert.equal(kernel(1, 1)[0], 6);
  assert.equal(kernel(1, 2)[0], 7);
  assert.equal(kernel(1, 3)[0], 8);
  assert.equal(kernel(2, 0)[0], 9);
  assert.equal(kernel(2, 1)[0], 10);
  assert.equal(kernel(2, 2)[0], 11);
  assert.equal(kernel(2, 3)[0], 12);
  assert.equal(kernel(3, 0)[0], 13);
  assert.equal(kernel(3, 1)[0], 14);
  assert.equal(kernel(3, 2)[0], 15);
  assert.equal(kernel(3, 3)[0], 16);

  gpu.destroy();
}

test('matrix4 auto', () => {
  testMatrix4();
});

test('matrix4 gpu', () => {
  testMatrix4('gpu');
});

(GPU.isWebGLSupported ? test : skip)('matrix4 webgl', () => {
  testMatrix4('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('matrix4 webgl2', () => {
  testMatrix4('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('matrix4 headlessgl', () => {
  testMatrix4('headlessgl');
});

test('matrix4 cpu', () => {
  testMatrix4('cpu');
});
