(function() {
  const GPU = require('../../src/index');
  function makeKernel(gpu) {
    return gpu.createKernel(function(a){
      return a[this.thread.y][this.thread.x];
    })
      .setOutput([matrixSize, matrixSize]);
  }

  function splitArray(array, part) {
    const result = [];
    for(let i = 0; i < array.length; i += part) {
      result.push(array.slice(i, i + part));
    }
    return result;
  }

  const matrixSize =  4;
  const A = splitArray(Array.apply(null, Array(matrixSize * matrixSize)).map((_, i) => i), matrixSize);

  function test(mode) {
    const gpu = new GPU({ mode });
    const noTexture = makeKernel(gpu);
    const texture = makeKernel(gpu).setOutputToTexture(true);

    const result = noTexture(A);
    const textureResult = texture(A).toArray(gpu);

    QUnit.assert.deepEqual(result.map(function(v) { return Array.from(v); }), A);
    QUnit.assert.deepEqual(textureResult.map(function(v) { return Array.from(v); }), A);
    QUnit.assert.deepEqual(textureResult, result);
    gpu.destroy();
  }

  QUnit.test("Issue #195 Read from Texture 2D (GPU only) (auto)", () => {
    test();
  });

  QUnit.test("Issue #195 Read from Texture 2D (GPU only) (gpu)", () => {
    test('gpu');
  });

  (GPU.isWebGLSupported ? QUnit.test : QUnit.skip)("Issue #195 Read from Texture 2D (GPU only) (webgl)", () => {
    test('webgl');
  });

  (GPU.isWebGL2Supported ? QUnit.test : QUnit.skip)("Issue #195 Read from Texture 2D (GPU Only) (webgl2)", () => {
    test('webgl2');
  });

  (GPU.isHeadlessGLSupported ? QUnit.test : QUnit.skip)("Issue #195 Read from Texture 2D (GPU Only) (headlessgl)", () => {
    test('headlessgl');
  });
})();
