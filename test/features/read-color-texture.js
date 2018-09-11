(function() {
  function colorSyntaxTest(mode) {
    var gpu = new GPU({ mode: mode });
    var createTexture = gpu.createKernel(
      function(value) {
        this.color(
          value[this.thread.y][this.thread.x],
          value[this.thread.y][this.thread.x],
          value[this.thread.y][this.thread.x],
          value[this.thread.y][this.thread.x]
        );
      }
    )
      .setOutput([4, 4])
      .setGraphical(true)
      .setOutputToTexture(true);

    var readRTexture = gpu.createKernel(
      function(texture) {
        var pixel = texture[this.thread.y][this.thread.x];
        return pixel.r;
      }
    )
      .setOutput([4, 4]);

    var readGTexture = gpu.createKernel(
      function(texture) {
        var pixel = texture[this.thread.y][this.thread.x];
        return pixel.g;
      }
    )
      .setOutput([4, 4]);

    var readBTexture = gpu.createKernel(
      function(texture) {
        var pixel = texture[this.thread.y][this.thread.x];
        return pixel.b;
      }
    )
      .setOutput([4, 4]);

    var readATexture = gpu.createKernel(
      function(texture) {
        var pixel = texture[this.thread.y][this.thread.x];
        return pixel.a;
      }
    )
      .setOutput([4, 4]);

    var texture = createTexture([
      [.01,.02,.03,.04],
      [.05,.06,.07,.08],
      [.09,.10,.11,.12],
      [.13,.14,.15,.16]
    ]);
    var resultR = readRTexture(texture);
    var resultG = readGTexture(texture);
    var resultB = readBTexture(texture);
    var resultA = readATexture(texture);

    QUnit.assert.equal(texture.constructor.name, 'Texture');

    // R
    QUnit.assert.equal(resultR[0][0].toFixed(2), '0.01');
    QUnit.assert.equal(resultR[0][1].toFixed(2), '0.02');
    QUnit.assert.equal(resultR[0][2].toFixed(2), '0.03');
    QUnit.assert.equal(resultR[0][3].toFixed(2), '0.04');

    QUnit.assert.equal(resultR[1][0].toFixed(2), '0.05');
    QUnit.assert.equal(resultR[1][1].toFixed(2), '0.06');
    QUnit.assert.equal(resultR[1][2].toFixed(2), '0.07');
    QUnit.assert.equal(resultR[1][3].toFixed(2), '0.08');

    QUnit.assert.equal(resultR[2][0].toFixed(2), '0.09');
    QUnit.assert.equal(resultR[2][1].toFixed(2), '0.10');
    QUnit.assert.equal(resultR[2][2].toFixed(2), '0.11');
    QUnit.assert.equal(resultR[2][3].toFixed(2), '0.12');

    QUnit.assert.equal(resultR[3][0].toFixed(2), '0.13');
    QUnit.assert.equal(resultR[3][1].toFixed(2), '0.14');
    QUnit.assert.equal(resultR[3][2].toFixed(2), '0.15');
    QUnit.assert.equal(resultR[3][3].toFixed(2), '0.16');

    // G
    QUnit.assert.equal(resultG[0][0].toFixed(2), '0.01');
    QUnit.assert.equal(resultG[0][1].toFixed(2), '0.02');
    QUnit.assert.equal(resultG[0][2].toFixed(2), '0.03');
    QUnit.assert.equal(resultG[0][3].toFixed(2), '0.04');

    QUnit.assert.equal(resultG[1][0].toFixed(2), '0.05');
    QUnit.assert.equal(resultG[1][1].toFixed(2), '0.06');
    QUnit.assert.equal(resultG[1][2].toFixed(2), '0.07');
    QUnit.assert.equal(resultG[1][3].toFixed(2), '0.08');

    QUnit.assert.equal(resultG[2][0].toFixed(2), '0.09');
    QUnit.assert.equal(resultG[2][1].toFixed(2), '0.10');
    QUnit.assert.equal(resultG[2][2].toFixed(2), '0.11');
    QUnit.assert.equal(resultG[2][3].toFixed(2), '0.12');

    QUnit.assert.equal(resultG[3][0].toFixed(2), '0.13');
    QUnit.assert.equal(resultG[3][1].toFixed(2), '0.14');
    QUnit.assert.equal(resultG[3][2].toFixed(2), '0.15');
    QUnit.assert.equal(resultG[3][3].toFixed(2), '0.16');

    // B
    QUnit.assert.equal(resultB[0][0].toFixed(2), '0.01');
    QUnit.assert.equal(resultB[0][1].toFixed(2), '0.02');
    QUnit.assert.equal(resultB[0][2].toFixed(2), '0.03');
    QUnit.assert.equal(resultB[0][3].toFixed(2), '0.04');

    QUnit.assert.equal(resultB[1][0].toFixed(2), '0.05');
    QUnit.assert.equal(resultB[1][1].toFixed(2), '0.06');
    QUnit.assert.equal(resultB[1][2].toFixed(2), '0.07');
    QUnit.assert.equal(resultB[1][3].toFixed(2), '0.08');

    QUnit.assert.equal(resultB[2][0].toFixed(2), '0.09');
    QUnit.assert.equal(resultB[2][1].toFixed(2), '0.10');
    QUnit.assert.equal(resultB[2][2].toFixed(2), '0.11');
    QUnit.assert.equal(resultB[2][3].toFixed(2), '0.12');

    QUnit.assert.equal(resultB[3][0].toFixed(2), '0.13');
    QUnit.assert.equal(resultB[3][1].toFixed(2), '0.14');
    QUnit.assert.equal(resultB[3][2].toFixed(2), '0.15');
    QUnit.assert.equal(resultB[3][3].toFixed(2), '0.16');

    // A
    QUnit.assert.equal(resultA[0][0].toFixed(2), '0.01');
    QUnit.assert.equal(resultA[0][1].toFixed(2), '0.02');
    QUnit.assert.equal(resultA[0][2].toFixed(2), '0.03');
    QUnit.assert.equal(resultA[0][3].toFixed(2), '0.04');

    QUnit.assert.equal(resultA[1][0].toFixed(2), '0.05');
    QUnit.assert.equal(resultA[1][1].toFixed(2), '0.06');
    QUnit.assert.equal(resultA[1][2].toFixed(2), '0.07');
    QUnit.assert.equal(resultA[1][3].toFixed(2), '0.08');

    QUnit.assert.equal(resultA[2][0].toFixed(2), '0.09');
    QUnit.assert.equal(resultA[2][1].toFixed(2), '0.10');
    QUnit.assert.equal(resultA[2][2].toFixed(2), '0.11');
    QUnit.assert.equal(resultA[2][3].toFixed(2), '0.12');

    QUnit.assert.equal(resultA[3][0].toFixed(2), '0.13');
    QUnit.assert.equal(resultA[3][1].toFixed(2), '0.14');
    QUnit.assert.equal(resultA[3][2].toFixed(2), '0.15');
    QUnit.assert.equal(resultA[3][3].toFixed(2), '0.16');


    QUnit.assert.ok('color syntax passed test');
    gpu.destroy();
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

  QUnit.test( 'colorSyntaxTest (cpu) throws', function(assert) {
    var mode = 'cpu';
    assert.throws(function() {
      colorSyntaxTest(mode);
    });
  });
})();
