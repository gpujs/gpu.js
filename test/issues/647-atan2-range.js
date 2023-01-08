const { assert, skip, test, module: describe } = require('qunit');
const { GPU } = require('../../src');

describe('issue #647');

function buildAtan2KernelResult(mode) {
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function (x, y) {
    return Math.atan2(y[this.thread.x], x[this.thread.x]);
  }, {
    output: [5],
  });

  // test atan2 at center, E, N, W, S on unit circle
  // [0,0] [1,0], [0, 1], [-1, 0], [0, -1]
  const x = [0, 1, 0, -1, 0];
  const y = [0, 0, 1, 0, -1];
  const result = kernel(x, y);

  assert.equal(result[0].toFixed(7), 0.0000000);
  assert.equal(result[1].toFixed(7), 0.0000000);
  assert.equal(result[2].toFixed(7), 1.5707964);
  assert.equal(result[3].toFixed(7), 3.1415927);
  assert.equal(result[4].toFixed(7), -1.5707964);
  gpu.destroy();
}

test('Issue #647 atan2 - auto', () => {
  buildAtan2KernelResult();
});

test('Issue #647 atan2 - gpu', () => {
  buildAtan2KernelResult('gpu');
});

(GPU.isWebGLSupported ? test : skip)('Issue #647 atan2 - webgl', () => {
  buildAtan2KernelResult('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('Issue #647 atan2 - webgl2', () => {
  buildAtan2KernelResult('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('Issue #647 atan2 - headlessgl', () => {
  buildAtan2KernelResult('headlessgl');
});

test('Issue #647 atan2 - cpu', () => {
  buildAtan2KernelResult('cpu');
});
