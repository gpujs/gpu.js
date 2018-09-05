(function() {
  function imageConstantTest(mode, assert) {
    var done = assert.async();
    var gpu = new GPU({ mode: mode });
    var image = new Image();
    image.src = 'data:image/jpeg;base64,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';
    image.onload = function() {
      var width = image.width;
      var height = image.height;
      var tryConst = gpu.createKernel(
        function() {
          var pixel = this.constants.image[this.thread.y][this.thread.x];
          var color = 0;
          if (this.thread.z === 0) {
            color = pixel.r;
          }
          if (this.thread.z === 1) {
            color = pixel.g;
          }
          if (this.thread.z === 2) {
            color = pixel.b;
          }
          return 255 * color;
        },
        {
          constants: { image }
        }
      ).setOutput([width, height, 3]);
      var result = tryConst();
      var test = result[0][0][0] > 0;
      QUnit.assert.ok(test, 'image constant passed test');
      tryConst.destroy();
      done();
    }
  }

  QUnit.test( 'imageConstantTest (auto)', function(assert) {
    var mode = null;
    imageConstantTest(mode, assert);
  });

  QUnit.test( 'imageConstantTest (gpu)', function(assert) {
    var mode = 'gpu';
    imageConstantTest(mode, assert);
  });

  QUnit.test( 'imageConstantTest (webgl)', function(assert) {
    var mode = 'webgl';
    imageConstantTest(mode, assert);
  });

  QUnit.test( 'imageConstantTest (webgl2)', function(assert) {
    var mode = 'webgl2';
    imageConstantTest(mode, assert);
  });

  QUnit.test( 'imageConstantTest (cpu)', function(assert) {
    var mode = 'cpu';
    imageConstantTest(mode, assert);
  });
})();
