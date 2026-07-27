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

  function testOffscreenCanvas(requestedMode, done) {
    const worker = new Worker('features/offscreen-canvas.js');
    worker.onmessage = function (e) {
      // GPU keeps the mode it was given; only auto resolves to the chosen
      // kernel's own mode, which is 'gpu' for all of the WebGL backends. Asking
      // for 'webgl' and expecting 'gpu' back was never going to hold, and
      // expecting it of 'cpu' least of all.
      const expectedMode = requestedMode || 'gpu';
      assert.equal(e.data.mode, expectedMode, `${expectedMode} mode used in Worker`);
      assert.deepEqual(e.data.result, Float32Array.from([-2, 0, 2]));
      done();
    };
    worker.postMessage(requestedMode);
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
