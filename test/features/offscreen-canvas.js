if (typeof importScripts !== 'undefined') {
  // inside Worker
  importScripts('../../dist/gpu-browser.js');
  onmessage = function (e) {
    // A worker does not necessarily have the contexts the page has -- Firefox
    // on Windows offers no WebGL2 here -- and an uncaught throw would surface
    // as a global failure with no test attached. Report it as data and let the
    // page decide what it proves.
    let gpu;
    try {
      gpu = new GPU({ mode: e.data });
    } catch (error) {
      postMessage({ unsupported: String(error.message || error) });
      return;
    }
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
      // The worker owns the answer to "is this mode available here": the page
      // may have WebGL2 while the worker does not (Firefox on Windows). An
      // unsupported mode is that browser's honest answer, not a gpu.js failure.
      if (e.data.unsupported) {
        assert.ok(
          /not supported/i.test(e.data.unsupported),
          `worker reported: ${e.data.unsupported}`
        );
        done();
        return;
      }
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
