const { assert, skip, test, module: describe } = require('qunit');
const { GPU } = require('../../src');

describe('issue # 174');

const input = [[0, 1, 2], [3, 4, 5], [6, 7, 8]];

// recursive!
function manyKernels(mode, kernelCount, t) {
  if (kernelCount < 1) return;
  const done = t.async();
  kernelCount--;

  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function(inp) {
    return inp[this.thread.y][this.thread.x];
  }, {
    output: [3, 3]
  });
  const kernel2 = gpu.createKernel(function() {
    return this.thread.y * this.thread.x;
  }, {
    output: [1024, 1024],
    pipeline: true
  });
  kernel(input);
  kernel2();
  assert.strictEqual(kernel.context, kernel2.context, "contexts should be the same object");
  manyKernels(mode, kernelCount, t);
  const canvas = kernel.canvas;
  const eventListener = canvas.addEventListener('webglcontextlost', (e) => {
    canvas.removeEventListener('webglcontextlost', eventListener);
    done();
  });

  gpu.destroy();
}

(GPU.isWebGLSupported ? test : skip)('Issue #174 - webgl context leak webgl', t => {
  manyKernels('webgl', 10, t);
});

(GPU.isWebGL2Supported ? test : skip)('Issue #174 - webgl context leak webgl2', t => {
  manyKernels('webgl2', 10, t);
});
