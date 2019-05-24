const { assert, skip, test, module: describe } = require('qunit');
const { GPU } = require('../../src');

describe('issue #396 - combine kernels example');

function combineKernelsExample(mode) {
  const gpu = new GPU({ mode });
  const add = gpu.createKernel(function(a, b) {
    return a[this.thread.x] + b[this.thread.x];
  }).setOutput([5]);

  const multiply = gpu.createKernel(function(a, b) {
    return a[this.thread.x] * b[this.thread.x];
  }).setOutput([5]);

  const superKernel = gpu.combineKernels(add, multiply, function(a, b, c) {
    return multiply(add(a, b), c);
  });

  const result = superKernel([1,2,3,4,5],[1,2,3,4,5],[1,2,3,4,5]);
  assert.deepEqual(Array.from(result), [2,
    8,
    18,
    32,
    50
  ]);
  gpu.destroy();
}

test('auto', () => {
  combineKernelsExample();
});

test('gpu', () => {
  combineKernelsExample('gpu');
});

(GPU.isWebGLSupported ? test : skip)('webgl', () => {
  combineKernelsExample('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('webgl2', () => {
  combineKernelsExample('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('headlessgl', () => {
  combineKernelsExample('headlessgl');
});

test('cpu', () => {
  combineKernelsExample('cpu');
});
