if (typeof importScripts !== 'undefined') {
  // inside Worker
  importScripts('../../dist/gpu-browser.js');
  onmessage = function (e) {
    const gpu = new GPU();
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
      const mode = e.data.mode;
      const result = e.data.result;
      assert.equal(mode, 'gpu', 'GPU mode used in Worker');
      assert.deepEqual(result, Float32Array.from([4]));
      done();
    };
    worker.postMessage('test');
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
