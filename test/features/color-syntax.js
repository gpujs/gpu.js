(function() {
  function colorSyntaxTest(mode) {
    var gpu = new GPU({ mode: mode });
    var createBuffer = gpu.createKernel(
      function() {
        this.color(55, 55, 55, 55);
      }
    ).setOutput([4, 4])
    .setOutputToTexture(true);
    var useBuffer = gpu.createKernel(
      function(buffer) {
        var pixel = buffer[this.thread.x][this.thread.y];
        var r = pixel.r;
        var g = pixel.g;
        var b = pixel.b;
        var a = pixel.a;
        this.color(r, g, b, a);
      }
    ).setOutput([4, 4]);
    var result1 = createBuffer();
    var result2 = useBuffer(result1);
    console.log("DEBUG:", result2);
    QUnit.assert.ok('color syntax passed test');
    tryConst.destroy();
  }

  QUnit.test( 'colorSyntaxTest (auto)', function(assert) {
    var mode = null;
    colorSyntaxTest(mode);
  });

  QUnit.test( 'colorSyntaxTest (gpu)', function(assert) {
    var mode = 'gpu';
    colorSyntaxTest(mode);
  });

  QUnit.test( 'colorSyntaxTest (webgl)', function(assert) {
    var mode = 'webgl';
    colorSyntaxTest(mode);
  });

  QUnit.test( 'colorSyntaxTest (webgl2)', function(assert) {
    var mode = 'webgl2';
    colorSyntaxTest(mode);
  });

  QUnit.test( 'integerConstantTest (cpu)', function(assert) {
    var mode = 'cpu';
    integerConstantTest(mode);
  });
})();
