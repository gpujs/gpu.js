if (typeof importScripts !== 'undefined') {
  // inside Worker
  importScripts('../../dist/gpu-browser.js');
  onmessage = function (e) {
    const gpu = new GPU({ mode: e.data });
    const a = [1,2,3];
    const b = [3,2,1];
    const kernel = gpu.createKernel(function(a, b) {
      return a[this.thread.x] - b[this.thread.x];
    })
      .setOutput([3]);
    postMessage({ mode: gpu.mode, result: kernel(a, b) });
    gpu.destroy();
  };
} else if (typeof isBrowser !== 'undefined' && isBrowser) {
  const { assert, skip, test, module: describe } = require('qunit');
  describe('offscreen canvas');

  function testOffscreenCanvas(mode, done) {
    const worker = new Worker('features/offscreen-canvas.js');
    worker.onmessage = function (e) {
      const mode = e.data.mode;
      const result = e.data.result;
      assert.equal(mode, 'gpu', 'GPU mode used in Worker');
      assert.deepEqual(result, Float32Array.from([-2, 0, 2]));
      done();
    };
    worker.postMessage(mode);
  }

  (GPU.isOffscreenCanvasSupported ? test : skip)('offscreen canvas auto', t => {
    testOffscreenCanvas(null, t.async());
  });

  (GPU.isOffscreenCanvasSupported ? test : skip)('offscreen canvas gpu', t => {
    testOffscreenCanvas('gpu', t.async());
  });

  (GPU.isOffscreenCanvasSupported ? test : skip)('offscreen canvas webgl', t => {
    testOffscreenCanvas('webgl', t.async());
  });

  (GPU.isOffscreenCanvasSupported ? test : skip)('offscreen canvas webgl2', t => {
    testOffscreenCanvas('webgl2', t.async());
  });

  (GPU.isOffscreenCanvasSupported ? test : skip)('offscreen canvas cpu', t => {
    testOffscreenCanvas('cpu', t.async());
  });
}
