const { assert, skip, test, module: describe } = require('qunit');
const { GPU } = require('../../src');

describe('issue #422 - warnings');

function warnings(mode) {
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function(a, b) {
    return a[this.thread.x] + b[this.thread.x];
  }).setOutput([10]);
  assert.deepEqual(Array.from(kernel([0,1,2,3,4,5,6,7,8,9], [0,1,2,3,4,5,6,7,8,9])), [0,2,4,6,8,10,12,14,16,18]);
  gpu.destroy();
}

test('auto', () => {
  warnings();
});

test('gpu', () => {
  warnings('gpu');
});

(GPU.isWebGLSupported ? test : skip)('webgl', () => {
  warnings('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('webgl2', () => {
  warnings('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('headlessgl', () => {
  warnings('headlessgl');
});

test('cpu', () => {
  warnings('cpu');
});
