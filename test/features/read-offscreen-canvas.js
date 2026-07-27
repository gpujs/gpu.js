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
    const kernel1 = gpu.createKernel(function() {
      this.color(1, 1, 1, 1);
    }, {
      output: [1, 1],
      graphical: true,
    });
    kernel1();
    const { canvas } = kernel1;
    const kernel2 = gpu.createKernel(function(canvas) {
      const pixel = canvas[0][this.thread.x];
      return pixel[0] + pixel[1] + pixel[2] + pixel[3];
    }, {
      output: [1],
    });
    postMessage({ mode: gpu.mode, result: kernel2(canvas) });
    gpu.destroy();
  };
} else if (typeof isBrowser !== 'undefined' && isBrowser) {
  const { assert, skip, test, module: describe } = require('qunit');
  describe('read offscreen canvas');

  function testReadOffscreenCanvas(mode, done) {
    const worker = new Worker('features/read-offscreen-canvas.js');
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
      const { result } = e.data;
      if (mode) assert.equal(e.data.mode, mode, 'GPU mode used in Worker');
      assert.deepEqual(result, Float32Array.from([4]));
      done();
    };
    worker.postMessage(mode);
  }

  (GPU.isOffscreenCanvasSupported ? test : skip)('read offscreen canvas auto', t => {
    testReadOffscreenCanvas(null, t.async());
  });

  (GPU.isOffscreenCanvasSupported ? test : skip)('read offscreen canvas gpu', t => {
    testReadOffscreenCanvas('gpu', t.async());
  });

  (GPU.isOffscreenCanvasSupported ? test : skip)('read offscreen canvas webgl', t => {
    testReadOffscreenCanvas('webgl', t.async());
  });

  (GPU.isOffscreenCanvasSupported ? test : skip)('read offscreen canvas webgl2', t => {
    testReadOffscreenCanvas('webgl2', t.async());
  });

  (GPU.isOffscreenCanvasSupported ? test : skip)('read offscreen canvas cpu', t => {
    testReadOffscreenCanvas('cpu', t.async());
  });
}
