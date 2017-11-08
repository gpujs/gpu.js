QUnit.test('KernelBase paramTypes CPU', function(assert) {
  const kernel = new GPU.CPUKernel(`function(value) { return value[this.thread.x]; }`, {
    output: [1],
    functionBuilder: {
      addKernel: function() {},
      addFunctions: function() {},
      getPrototypes: function() { return []; }
    },
  });
  kernel.build([1]);
  assert.equal(kernel.paramTypes.length, 1);
  assert.equal(kernel.paramTypes[0], 'Array');
});

QUnit.test('KernelBase paramTypes WebGL', function(assert) {
  const kernel = new GPU.WebGLKernel(`function(value) { return value[this.thread.x]; }`, {
    output: [1],
    functionBuilder: {
      addKernel: function() {},
      addFunctions: function() {},
      getPrototypes: function() { return []; },
      addNativeFunctions: function() {},
      getPrototypeString: function() { return ''; }
    },
  });
  try {
    kernel.build([1]);
  } catch (e) {}
  assert.equal(kernel.paramTypes.length, 1);
  assert.equal(kernel.paramTypes[0], 'Array');
});