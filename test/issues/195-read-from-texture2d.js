(function() {
  function makeKernel(gpu) {
    return gpu.createKernel(function(a){
      return a[this.thread.y][this.thread.x];
    })
      .setOutput([matrixSize, matrixSize]);
  }

  function splitArray(array, part) {
    var result = [];
    for(var i = 0; i < array.length; i += part) {
      result.push(array.slice(i, i + part));
    }
    return result;
  }

  var matrixSize =  4;
  var A = Array.apply(null, Array(matrixSize*matrixSize)).map(function (_, i) {return i;});
  A = splitArray(A, matrixSize);

  QUnit.test( "Issue #195 Read from Texture 2D (GPU only) (auto)", function() {
    const gpu = new GPU({ mode: null });
    const noTexture = makeKernel(gpu);
    const texture = makeKernel(gpu).setOutputToTexture(true);

    const result = noTexture(A);
    const textureResult = texture(A).toArray(gpu);

    QUnit.assert.deepEqual(result, A);
    QUnit.assert.deepEqual(textureResult, A);
    QUnit.assert.deepEqual(textureResult, result);
    gpu.destroy();
  });

  QUnit.test( "Issue #195 Read from Texture 2D (GPU only) (gpu)", function() {
    const gpu = new GPU({ mode: 'gpu' });
    const noTexture = makeKernel(gpu);
    const texture = makeKernel(gpu).setOutputToTexture(true);

    const result = noTexture(A);
    const textureResult = texture(A).toArray(gpu);

    QUnit.assert.deepEqual(result, A);
    QUnit.assert.deepEqual(textureResult, A);
    QUnit.assert.deepEqual(textureResult, result);
    gpu.destroy();
  });

  QUnit.test( "Issue #195 Read from Texture 2D (GPU only) (webgl)", function() {
    const gpu = new GPU({ mode: 'webgl' });
    const noTexture = makeKernel(gpu);
    const texture = makeKernel(gpu).setOutputToTexture(true);

    const result = noTexture(A);
    const textureResult = texture(A).toArray(gpu);

    QUnit.assert.deepEqual(result, A);
    QUnit.assert.deepEqual(textureResult, A);
    QUnit.assert.deepEqual(textureResult, result);
    gpu.destroy();
  });

  QUnit.test( "Issue #195 Read from Texture 2D (GPU Only) (webgl2)", function() {
    const gpu = new GPU({ mode: 'webgl2' });
    const noTexture = makeKernel(gpu);
    const texture = makeKernel(gpu).setOutputToTexture(true);

    const result = noTexture(A);
    const textureResult = texture(A).toArray(gpu);

    QUnit.assert.deepEqual(result, A);
    QUnit.assert.deepEqual(textureResult, A);
    QUnit.assert.deepEqual(textureResult, result);
    gpu.destroy();
  });
})();
