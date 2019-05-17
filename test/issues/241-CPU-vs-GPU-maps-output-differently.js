const { assert, skip, test, module: describe } = require('qunit');
const { GPU } = require('../../src');

describe('issue #241');

// this is actually equiv to
// return this.thread.y * 3 + this.thread.x;
const input = [[0, 1, 2], [3, 4, 5], [6, 7, 8]];
function buildIndexTestKernel(mode) {
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function(inp) {
    return inp[this.thread.y][this.thread.x];
  }, {
    output: [3, 3]
  });
  const result = kernel(input).map((v) => Array.from(v));
  assert.deepEqual(result, input);
  gpu.destroy();
}

test('Issue #241 small 2d array input output test auto', () => {
  buildIndexTestKernel();
});

test('Issue #241 small 2d array input output test gpu', () => {
  buildIndexTestKernel('gpu');
});

(GPU.isWebGLSupported ? test : skip)('Issue #241 small 2d array input output test webgl', () => {
  buildIndexTestKernel('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('Issue #241 small 2d array input output test webgl2', () => {
  buildIndexTestKernel('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('Issue #241 small 2d array input output test headlessgl', () => {
  buildIndexTestKernel('headlessgl');
});

test('Issue #241 small 2d array input output test cpu', () => {
  buildIndexTestKernel('cpu');
});
