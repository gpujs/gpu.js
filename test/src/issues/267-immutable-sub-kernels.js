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
      outputTexture: true
    }
  );
}

QUnit.test('Issue #267 immutable sub-kernel output - auto', () => {
  const gpu = new GPU();
  const kernel = immutableSubKernels(gpu);

  // start with a value on CPU
  const output1 = kernel([1], [2]);
  const result1 = output1.valueOutput1.toArray(gpu)[0];

  // reuse that output, simulating that this value will be monitored, and updated via the same kernel
  // this is often used in neural networks
  const output2 = kernel(output1.valueOutput1, output1.valueOutput2);
  const result2 = output2.valueOutput1.toArray(gpu)[0];

  QUnit.assert.equal(result1, 2);
  QUnit.assert.equal(result2, 3);
});

QUnit.test('Issue #267 immutable sub-kernel output - gpu', () => {
  const gpu = new GPU({ mode: 'gpu' });
  const kernel = immutableSubKernels(gpu);

  // start with a value on CPU
  const output1 = kernel([1], [2]);
  const result1 = output1.valueOutput1.toArray(gpu)[0];

  // reuse that output, simulating that this value will be monitored, and updated via the same kernel
  // this is often used in neural networks
  const output2 = kernel(output1.valueOutput1, output1.valueOutput2);
  const result2 = output2.valueOutput1.toArray(gpu)[0];

  QUnit.assert.equal(result1, 2);
  QUnit.assert.equal(result2, 3);
});