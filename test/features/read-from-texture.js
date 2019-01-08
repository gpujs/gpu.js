(function() {
  function readFromTextureKernels(output, gpu) {
    function add(m, n) {
      return m + n;
    }

    return gpu.createKernelMap({
      addResult: add
    }, function (a, b) {
      return add(a[this.thread.x], b[this.thread.x]);
    }).setOutput(output);
  }

  QUnit.test('Read from Texture (auto)', function() {
    const gpu = new GPU();
    const A = [1, 2, 3, 4, 5];
    const B = [1, 2, 3, 4, 5];
    const kernels = readFromTextureKernels([A.length], gpu);
    const result = kernels(A, B);
    const textureResult = result.addResult;

    QUnit.assert.deepEqual(QUnit.extend([], result.result), [2, 4, 6, 8, 10]);
    QUnit.assert.deepEqual(QUnit.extend([], textureResult.toArray(gpu)), [2, 4, 6, 8, 10]);
    gpu.destroy();
  });

  QUnit.test('Read from Texture (gpu)', function() {
    const gpu = new GPU({ mode: 'gpu'});
    const A = [1, 2, 3, 4, 5];
    const B = [1, 2, 3, 4, 5];
    const kernels = readFromTextureKernels([A.length], gpu);
    const result = kernels(A, B);
    const textureResult = result.addResult;

    QUnit.assert.deepEqual(QUnit.extend([], result.result), [2, 4, 6, 8, 10]);
    QUnit.assert.deepEqual(QUnit.extend([], textureResult.toArray(gpu)), [2, 4, 6, 8, 10]);
    gpu.destroy();
  });

  QUnit.test('Read from Texture (webgl)', function() {
    const gpu = new GPU({ mode: 'webgl'});
    const A = [1, 2, 3, 4, 5];
    const B = [1, 2, 3, 4, 5];
    const kernels = readFromTextureKernels([A.length], gpu);
    const result = kernels(A, B);
    const textureResult = result.addResult;

    QUnit.assert.deepEqual(QUnit.extend([], result.result), [2, 4, 6, 8, 10]);
    QUnit.assert.deepEqual(QUnit.extend([], textureResult.toArray(gpu)), [2, 4, 6, 8, 10]);
    gpu.destroy();
  });

  QUnit.test('Read from Texture (webgl2)', function() {
    const gpu = new GPU({ mode: 'webgl2'});
    const A = [1, 2, 3, 4, 5];
    const B = [1, 2, 3, 4, 5];
    const kernels = readFromTextureKernels([A.length], gpu);
    const result = kernels(A, B);
    const textureResult = result.addResult;

    QUnit.assert.deepEqual(QUnit.extend([], result.result), [2, 4, 6, 8, 10]);
    QUnit.assert.deepEqual(QUnit.extend([], textureResult.toArray(gpu)), [2, 4, 6, 8, 10]);
    gpu.destroy();
  });
})();