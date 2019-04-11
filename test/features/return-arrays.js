const { assert, skip, test, module: describe, only } = require('qunit');
const { GPU } = require('../../src');

describe('features: return arrays');

function returnArray2FromKernel(mode) {
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function() {
    return [1, 2];
  }, { output: [1], floatOutput: true });
  const result = kernel();
  assert.deepEqual(result.map(v => Array.from(v)), [[1, 2]]);
  gpu.destroy();
}

test('return Array(2) from kernel auto', () => {
  returnArray2FromKernel();
});

test('return Array(2) from kernel gpu', () => {
  returnArray2FromKernel('gpu');
});

(GPU.isWebGLSupported ? test : skip)('return Array(2) from kernel webgl', () => {
  returnArray2FromKernel('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('return Array(2) from kernel webgl2', () => {
  returnArray2FromKernel('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('return Array(2) from kernel headlessgl', () => {
  returnArray2FromKernel('headlessgl');
});

test('return Array(2) from kernel cpu', () => {
  returnArray2FromKernel('cpu');
});


function returnArray3FromKernel(mode) {
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function() {
    return [1, 2, 3];
  }, { output: [1], floatOutput: true });
  const result = kernel();
  assert.deepEqual(Array.from(result.map(v => Array.from(v))), [[1, 2, 3]]);
  gpu.destroy();
}

test('return Array(3) from kernel auto', () => {
  returnArray3FromKernel();
});

test('return Array(3) from kernel gpu', () => {
  returnArray3FromKernel('gpu');
});

(GPU.isWebGLSupported ? test : skip)('return Array(3) from kernel webgl', () => {
  returnArray3FromKernel('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('return Array(3) from kernel webgl2', () => {
  returnArray3FromKernel('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('return Array(3) from kernel headlessgl', () => {
  returnArray3FromKernel('headlessgl');
});

test('return Array(3) from kernel cpu', () => {
  returnArray3FromKernel('cpu');
});

function returnArray4FromKernel(mode) {
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function() {
    return [1, 2, 3, 4];
  }, { output: [1], floatOutput: true });
  const result = kernel();
  assert.deepEqual(result.map(v => Array.from(v)), [[1, 2, 3, 4]]);
  gpu.destroy();
}

test('return Array(4) from kernel auto', () => {
  returnArray4FromKernel();
});

test('return Array(4) from kernel gpu', () => {
  returnArray4FromKernel('gpu');
});

(GPU.isWebGLSupported ? test : skip)('return Array(4) from kernel webgl', () => {
  returnArray4FromKernel('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('return Array(4) from kernel webgl2', () => {
  returnArray4FromKernel('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('return Array(4) from kernel headlessgl', () => {
  returnArray4FromKernel('headlessgl');
});

test('return Array(4) from kernel cpu', () => {
  returnArray4FromKernel('cpu');
});
