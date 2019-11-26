const { assert, skip, test, module: describe, only } = require('qunit');
const { GPU } = require('../../src');

describe('features: destructured assignment');

function testObject(mode) {
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function() {
    const { thread: { x, y } } = this;
    return x + y;
  }, { output: [2, 2] });
  assert.deepEqual(kernel(), [new Float32Array([0, 1]), new Float32Array([1, 2])]);
}

test('object auto', () => {
  testObject();
});

test('object gpu', () => {
  testObject('gpu');
});

(GPU.isWebGLSupported ? test : skip)('object webgl', () => {
  testObject('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('object webgl2', () => {
  testObject('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('object headlessgl', () => {
  testObject('headlessgl');
});

test('object cpu', () => {
  testObject('cpu');
});

function testNestedObject(mode) {
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function() {
    const { x, y } = this.thread;
    return x + y;
  }, { output: [2, 2] });
  assert.deepEqual(kernel(), [new Float32Array([0, 1]), new Float32Array([1, 2])]);
}

test('nested object auto', () => {
  testNestedObject();
});

test('nested object gpu', () => {
  testNestedObject('gpu');
});

(GPU.isWebGLSupported ? test : skip)('nested object webgl', () => {
  testNestedObject('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('nested object webgl2', () => {
  testNestedObject('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('nested object headlessgl', () => {
  testNestedObject('headlessgl');
});

test('nested object cpu', () => {
  testNestedObject('cpu');
});

function testArray(mode) {
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function(array) {
    const [first, second] = array;
    return first + second;
  }, { output: [1], argumentTypes: { array: 'Array(2)' } });
  assert.deepEqual(kernel([1, 2]), new Float32Array([3]));
}

test('array auto', () => {
  testArray();
});

test('array gpu', () => {
  testArray('gpu');
});

(GPU.isWebGLSupported ? test : skip)('array webgl', () => {
  testArray('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('array webgl2', () => {
  testArray('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('array headlessgl', () => {
  testArray('headlessgl');
});

test('array cpu', () => {
  testArray('cpu');
});