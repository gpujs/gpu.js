const { assert, skip, test, module: describe, only } = require('qunit');
const { GPU } = require('../../src');

describe('issue #586 - unable to resize');

function testResize(convert, mode) {
  const gpu = new GPU({ mode });
  const createTexture1 = gpu.createKernel(function() {
    return 1;
  }, { output: [2, 2], pipeline: false});

  const createTexture2 = gpu.createKernel(function() {
    return 1;
  }, { output: [4, 4], pipeline: true});

  var t1 = createTexture1();
  var t2 = createTexture2();

  assert.deepEqual(convert(t2), [
    new Float32Array([1,1,1,1]),
    new Float32Array([1,1,1,1]),
    new Float32Array([1,1,1,1]),
    new Float32Array([1,1,1,1]),
  ]);

  gpu.destroy();
}

test('auto', () => {
  testResize(t => t.toArray());
});

test('gpu', () => {
  testResize(t => t.toArray(), 'gpu');
});

(GPU.isWebGLSupported ? test : skip)('webgl', () => {
  testResize(t => t.toArray(), 'webgl');
});

(GPU.isWebGL2Supported ? test : skip)('webgl2', () => {
  testResize(t => t.toArray(), 'webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('headlessgl', () => {
  testResize(t => t.toArray(), 'headlessgl');
});

test('cpu', () => {
  testResize(a => a, 'cpu');
});