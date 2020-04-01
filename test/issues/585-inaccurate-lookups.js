const { assert, skip, test, module: describe, only } = require('qunit');
const { GPU } = require('../../src');

describe('issue #585 - inaccurate lookups');

function testResize(mode) {
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function(value) {
    return value[this.thread.x];
  }, {
    output: [4],
  });

  const result = kernel([0,1,2,3]);
  assert.equal(Math.round(result[0]), 0);
  assert.equal(Math.round(result[1]), 1);
  assert.equal(Math.round(result[2]), 2);
  assert.equal(Math.round(result[3]), 3);
  gpu.destroy();
}

test('auto', () => {
  testResize();
});

test('gpu', () => {
  testResize('gpu');
});

(GPU.isWebGLSupported ? test : skip)('webgl', () => {
  testResize('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('webgl2', () => {
  testResize('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('headlessgl', () => {
  testResize('headlessgl');
});

test('cpu', () => {
  testResize('cpu');
});