(function() {
  if (typeof(document) === 'undefined') {
    // inside Worker
    importScripts('../../bin/gpu.js');
    onmessage = function(e) {
      const gpu = new GPU();
      const a = [1,2,3];
      const b = [3,2,1];
      const kernel = gpu.createKernel(function(a, b) {
        return a[this.thread.x] - b[this.thread.x];
      })
        .setOutput([3]);
      postMessage({ mode: gpu.getMode(), result: kernel(a, b) });
      gpu.destroy();
    };
    return;
  }

  // skip test if browser doesn't support Workers or OffscreenCanvas
  var test = (typeof(Worker) === 'undefined') || (typeof(OffscreenCanvas) === 'undefined') ?
              QUnit.skip : QUnit.test;

  test('OffscreenCanvas used in Worker', function(assert) {
    var worker = new Worker('features/offscreen-canvas.js');
    var done = assert.async();

    worker.onmessage = function(e) {
      var mode = e.data.mode;
      var result = e.data.result;
      assert.equal(mode, 'gpu', 'GPU mode used in Worker');
      assert.deepEqual(result, Float32Array.from([-2, 0, 2]));
      done();
    };

    worker.postMessage('test');
  });

})();
