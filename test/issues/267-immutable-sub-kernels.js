(function() {
  function immutableKernel(gpu) {
    return gpu.createKernel(function(v) {
      return v[this.thread.x] + 1;
    }, {
      output: [1],
      outputImmutable: true,
      outputToTexture: true
    });
  }

  function immutableSubKernels(gpu) {
    return gpu.createKernelMap(
      {
        valueOutput1: function value1(value) {
          return value + 1;
        },
        valueOutput2: function value2(value) {
          return value + 1;
        }
      },
      function(a, b) {
        value1(a[this.thread.x]);
        return value2(b[this.thread.x]);
      },
      {
        output: [1],
        outputImmutable: true,
        outputToTexture: true
      }
    );
  }

  function immutableKernelsMixed(gpu) {
    return gpu.createKernelMap(
      {
        valueOutput1: function value1(value) {
          return value + 1;
        },
        valueOutput2: function value2(value) {
          return value + 1;
        }
      },
      function(a, b) {
        value1(a[this.thread.x]);
        return value2(b[this.thread.x]) + 1;
      },
      {
        output: [1],
        outputImmutable: true,
        outputToTexture: true
      }
    );
  }

  QUnit.test('Issue #267 immutable kernel output - (auto)', () => {
    const gpu = new GPU();
    const kernel = immutableKernel(gpu);

    // start with a value on CPU
    const output1 = kernel([1]);
    const result1 = output1.toArray(gpu)[0];

    // reuse that output, simulating that this value will be monitored, and updated via the same kernel
    // this is often used in neural networks
    const output2 = kernel(output1);
    const result2 = output2.toArray(gpu)[0];

    const output3 = kernel(output2);
    const result3 = output3.toArray(gpu)[0];

    QUnit.assert.equal(result1, 2);
    QUnit.assert.equal(result2, 3);
    QUnit.assert.equal(result3, 4);
    gpu.destroy();
  });

  QUnit.test('Issue #267 immutable kernel output - (gpu)', () => {
    const gpu = new GPU({ mode: 'gpu' });
    const kernel = immutableKernel(gpu);

    // start with a value on CPU
    const output1 = kernel([1]);
    const result1 = output1.toArray(gpu)[0];

    // reuse that output, simulating that this value will be monitored, and updated via the same kernel
    // this is often used in neural networks
    const output2 = kernel(output1);
    const result2 = output2.toArray(gpu)[0];

    const output3 = kernel(output2);
    const result3 = output3.toArray(gpu)[0];

    QUnit.assert.equal(result1, 2);
    QUnit.assert.equal(result2, 3);
    QUnit.assert.equal(result3, 4);
    gpu.destroy();
  });

  QUnit.test('Issue #267 immutable kernel output - (webgl)', () => {
    const gpu = new GPU({ mode: 'webgl' });
    const kernel = immutableKernel(gpu);

    // start with a value on CPU
    const output1 = kernel([1]);
    const result1 = output1.toArray(gpu)[0];

    // reuse that output, simulating that this value will be monitored, and updated via the same kernel
    // this is often used in neural networks
    const output2 = kernel(output1);
    const result2 = output2.toArray(gpu)[0];

    const output3 = kernel(output2);
    const result3 = output3.toArray(gpu)[0];

    QUnit.assert.equal(result1, 2);
    QUnit.assert.equal(result2, 3);
    QUnit.assert.equal(result3, 4);
    gpu.destroy();
  });

  QUnit.test('Issue #267 immutable kernel output - (webgl2)', () => {
    const gpu = new GPU({ mode: 'webgl2' });
    const kernel = immutableKernel(gpu);

    // start with a value on CPU
    const output1 = kernel([1]);
    const result1 = output1.toArray(gpu)[0];

    // reuse that output, simulating that this value will be monitored, and updated via the same kernel
    // this is often used in neural networks
    const output2 = kernel(output1);
    const result2 = output2.toArray(gpu)[0];

    const output3 = kernel(output2);
    const result3 = output3.toArray(gpu)[0];

    QUnit.assert.equal(result1, 2);
    QUnit.assert.equal(result2, 3);
    QUnit.assert.equal(result3, 4);
    gpu.destroy();
  });

  QUnit.test('Issue #267 immutable sub-kernel output - (auto)', () => {
    const gpu = new GPU();
    const kernel = immutableSubKernels(gpu);

    // start with a value on CPU
    const output1 = kernel([1], [2]);
    const result1 = output1.valueOutput1.toArray(gpu)[0];

    // reuse that output, simulating that this value will be monitored, and updated via the same kernel
    // this is often used in neural networks
    const output2 = kernel(output1.valueOutput1, output1.valueOutput2);
    const result2 = output2.valueOutput1.toArray(gpu)[0];

    const output3 = kernel(output2.valueOutput1, output2.valueOutput2);
    const result3 = output3.valueOutput1.toArray(gpu)[0];

    QUnit.assert.equal(result1, 2);
    QUnit.assert.equal(result2, 3);
    QUnit.assert.equal(result3, 4);
    gpu.destroy();
  });

  QUnit.test('Issue #267 immutable sub-kernel output - (gpu)', () => {
    const gpu = new GPU({ mode: 'gpu' });
    const kernel = immutableSubKernels(gpu);

    // start with a value on CPU
    const output1 = kernel([1], [2]);
    const result1 = output1.valueOutput1.toArray(gpu)[0];

    // reuse that output, simulating that this value will be monitored, and updated via the same kernel
    // this is often used in neural networks
    const output2 = kernel(output1.valueOutput1, output1.valueOutput2);
    const result2 = output2.valueOutput1.toArray(gpu)[0];

    const output3 = kernel(output2.valueOutput1, output2.valueOutput2);
    const result3 = output3.valueOutput1.toArray(gpu)[0];

    QUnit.assert.equal(result1, 2);
    QUnit.assert.equal(result2, 3);
    QUnit.assert.equal(result3, 4);
    gpu.destroy();
  });

  QUnit.test('Issue #267 immutable sub-kernel output - (webgl)', () => {
    const gpu = new GPU({ mode: 'webgl' });
    const kernel = immutableSubKernels(gpu);

    // start with a value on CPU
    const output1 = kernel([1], [2]);
    const result1 = output1.valueOutput1.toArray(gpu)[0];

    // reuse that output, simulating that this value will be monitored, and updated via the same kernel
    // this is often used in neural networks
    const output2 = kernel(output1.valueOutput1, output1.valueOutput2);
    const result2 = output2.valueOutput1.toArray(gpu)[0];

    const output3 = kernel(output2.valueOutput1, output2.valueOutput2);
    const result3 = output3.valueOutput1.toArray(gpu)[0];

    QUnit.assert.equal(result1, 2);
    QUnit.assert.equal(result2, 3);
    QUnit.assert.equal(result3, 4);
    gpu.destroy();
  });

  QUnit.test('Issue #267 immutable sub-kernel output - (webgl2)', () => {
    const gpu = new GPU({ mode: 'webgl2' });
    const kernel = immutableSubKernels(gpu);

    // start with a value on CPU
    const output1 = kernel([1], [2]);
    const result1 = output1.valueOutput1.toArray(gpu)[0];

    // reuse that output, simulating that this value will be monitored, and updated via the same kernel
    // this is often used in neural networks
    const output2 = kernel(output1.valueOutput1, output1.valueOutput2);
    const result2 = output2.valueOutput1.toArray(gpu)[0];

    const output3 = kernel(output2.valueOutput1, output2.valueOutput2);
    const result3 = output3.valueOutput1.toArray(gpu)[0];

    QUnit.assert.equal(result1, 2);
    QUnit.assert.equal(result2, 3);
    QUnit.assert.equal(result3, 4);
    gpu.destroy();
  });

  QUnit.test('Issue #267 immutable kernel & sub-kernel output - (auto)', () => {
    const gpu = new GPU();
    const kernel = immutableKernelsMixed(gpu);

    // start with a value on CPU
    const output1 = kernel([1], [2]);
    const result1 = output1.result.toArray(gpu)[0];

    // reuse that output, simulating that this value will be monitored, and updated via the same kernel
    // this is often used in neural networks
    const output2 = kernel(output1.result, output1.valueOutput2);
    const result2 = output2.result.toArray(gpu)[0];

    const output3 = kernel(output2.result, output2.valueOutput2);
    const result3 = output3.result.toArray(gpu)[0];

    QUnit.assert.equal(result1, 4);
    QUnit.assert.equal(result2, 5);
    QUnit.assert.equal(result3, 6);
    gpu.destroy();
  });

  QUnit.test('Issue #267 immutable kernel & sub-kernel output - (gpu)', () => {
    const gpu = new GPU({ mode: 'gpu' });
    const kernel = immutableKernelsMixed(gpu);

    // start with a value on CPU
    const output1 = kernel([1], [2]);
    const result1 = output1.result.toArray(gpu)[0];

    // reuse that output, simulating that this value will be monitored, and updated via the same kernel
    // this is often used in neural networks
    const output2 = kernel(output1.result, output1.valueOutput2);
    const result2 = output2.result.toArray(gpu)[0];

    const output3 = kernel(output2.result, output2.valueOutput2);
    const result3 = output3.result.toArray(gpu)[0];

    QUnit.assert.equal(result1, 4);
    QUnit.assert.equal(result2, 5);
    QUnit.assert.equal(result3, 6);
    gpu.destroy();
  });

  QUnit.test('Issue #267 immutable kernel & sub-kernel output - (webgl)', () => {
    const gpu = new GPU({ mode: 'webgl' });
    const kernel = immutableKernelsMixed(gpu);

    // start with a value on CPU
    const output1 = kernel([1], [2]);
    const result1 = output1.result.toArray(gpu)[0];

    // reuse that output, simulating that this value will be monitored, and updated via the same kernel
    // this is often used in neural networks
    const output2 = kernel(output1.result, output1.valueOutput2);
    const result2 = output2.result.toArray(gpu)[0];

    const output3 = kernel(output2.result, output2.valueOutput2);
    const result3 = output3.result.toArray(gpu)[0];

    QUnit.assert.equal(result1, 4);
    QUnit.assert.equal(result2, 5);
    QUnit.assert.equal(result3, 6);
    gpu.destroy();
  });

  QUnit.test('Issue #267 immutable kernel & sub-kernel output - (webgl2)', () => {
    const gpu = new GPU({ mode: 'webgl2' });
    const kernel = immutableKernelsMixed(gpu);

    // start with a value on CPU
    const output1 = kernel([1], [2]);
    const result1 = output1.result.toArray(gpu)[0];

    // reuse that output, simulating that this value will be monitored, and updated via the same kernel
    // this is often used in neural networks
    const output2 = kernel(output1.result, output1.valueOutput2);
    const result2 = output2.result.toArray(gpu)[0];

    const output3 = kernel(output2.result, output2.valueOutput2);
    const result3 = output3.result.toArray(gpu)[0];

    QUnit.assert.equal(result1, 4);
    QUnit.assert.equal(result2, 5);
    QUnit.assert.equal(result3, 6);
    gpu.destroy();
  });
})();