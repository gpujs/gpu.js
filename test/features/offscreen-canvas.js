(function() {
  if (typeof(document) === 'undefined') {
    // inside Worker
    window = {};
    importScripts('../../bin/gpu.js');

    onmessage = function(e) {
      const gpu = new window.GPU();

      postMessage(gpu.getMode());
    };

    return;
  }

  // skip test if browser doesn't support Workers or OffscreenCanvas
  var test = (typeof(Worker) === 'undefined') || (typeof(OffscreenCanvas) === 'undefined') ?
              QUnit.skip : QUnit.test;

  test( 'OffscreenCanvas used in Worker', function(assert) {
    var worker = new Worker('features/offscreen-canvas.js');
    var done = assert.async();

    worker.onmessage = function(e) {
      var mode = e.data;

      assert.equal( mode, 'gpu', 'GPU mode used in Worker' );

      done();
    };

    worker.postMessage('test');
  });

})();
