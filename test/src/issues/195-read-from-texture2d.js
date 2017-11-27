QUnit.test( "Issue #195 Read from Texture 2D", function() {

  var matrixSize =  4;
  var A = Array.apply(null, Array(matrixSize*matrixSize)).map(function (_, i) {return i;});
  A = splitArray(A, matrixSize)

  const gpu = new GPU({ mode: 'gpu' });

  function make_kernel(gpu) {
    return gpu.createKernel(function(a){
      return a[this.thread.y][this.thread.x];
    }).setOutput([matrixSize, matrixSize]);
  };

  const no_texture = make_kernel(gpu);
  const texture = make_kernel(gpu).setOutputToTexture(true);

  const result = no_texture(A);
  const textureResult = texture(A).toArray(gpu);

  function splitArray(array, part) {
    var result = [];
    for(var i = 0; i < array.length; i += part) {
      result.push(array.slice(i, i + part));
    }
    return result;
  };

  QUnit.assert.deepEqual(result, A);
  QUnit.assert.deepEqual(textureResult, A);
  QUnit.assert.deepEqual(textureResult, result);
});
