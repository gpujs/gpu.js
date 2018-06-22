QUnit.test('KernelBase paramTypes CPU', function(assert) {
  const kernel = new GPU.CPUKernel(`function(value) { return value[this.thread.x]; }`, {
    output: [1],
    functionBuilder: {
      addKernel: function() {},
      addFunctions: function() {},
      getPrototypes: function() { return []; },
      addNativeFunctions: function() {}
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

QUnit.test('WebGLKernel.setUniform1f only calls webgl when values change', () => {
  const kernel = new GPU.WebGLKernel('', { output: [1] });
  let throws = false;
  kernel._webGl = {
    uniform1f: () => {
      if (throws) new Error('This should not get called');
    },
    getUniformLocation: (name) => {
      return name;
    }
  };
  kernel.setUniform1f('test', 1);
  QUnit.assert.equal(kernel.uniform1fCache['test'], 1);

  throws = true;
  kernel.setUniform1f('test', 1);
  QUnit.assert.equal(kernel.uniform1fCache['test'], 1);

  throws = false;
  kernel.setUniform1f('test', 2);
  QUnit.assert.equal(kernel.uniform1fCache['test'], 2);
});
QUnit.test('WebGLKernel.setUniform1i only calls webgl when values change', () => {
  const kernel = new GPU.WebGLKernel('', { output: [1] });
  let throws = false;
  kernel._webGl = {
    uniform1i: () => {
      if (throws) new Error('This should not get called');
    },
    getUniformLocation: (name) => {
      return name;
    }
  };
  kernel.setUniform1i('test', 1);
  QUnit.assert.equal(kernel.uniform1iCache['test'], 1);

  throws = true;
  kernel.setUniform1i('test', 1);
  QUnit.assert.equal(kernel.uniform1iCache['test'], 1);

  throws = false;
  kernel.setUniform1i('test', 2);
  QUnit.assert.equal(kernel.uniform1iCache['test'], 2);
});
QUnit.test('WebGLKernel.setUniform2f only calls webgl when values change', () => {
  const kernel = new GPU.WebGLKernel('', { output: [1] });
  let throws = false;
  kernel._webGl = {
    uniform2f: () => {
      if (throws) new Error('This should not get called');
    },
    getUniformLocation: (name) => {
      return name;
    }
  };
  kernel.setUniform2f('test', 1, 2);
  QUnit.assert.deepEqual(kernel.uniform2fCache['test'], [1, 2]);

  throws = true;
  kernel.setUniform2f('test', 1, 2);
  QUnit.assert.deepEqual(kernel.uniform2fCache['test'], [1, 2]);

  throws = false;
  kernel.setUniform2f('test', 3, 4);
  QUnit.assert.deepEqual(kernel.uniform2fCache['test'], [3, 4]);
});
QUnit.test('WebGLKernel.setUniform2fv only calls webgl when values change', () => {
  const kernel = new GPU.WebGLKernel('', { output: [1] });
  let throws = false;
  kernel._webGl = {
    uniform2fv: () => {
      if (throws) new Error('This should not get called');
    },
    getUniformLocation: (name) => {
      return name;
    }
  };
  kernel.setUniform2fv('test', [1, 2]);
  QUnit.assert.deepEqual(kernel.uniform2fvCache['test'], [1, 2]);

  throws = true;
  kernel.setUniform2fv('test', [1, 2]);
  QUnit.assert.deepEqual(kernel.uniform2fvCache['test'], [1, 2]);

  throws = false;
  kernel.setUniform2fv('test', [2, 3]);
  QUnit.assert.deepEqual(kernel.uniform2fvCache['test'], [2, 3]);
});
QUnit.test('WebGLKernel.setUniform3fv only calls webgl when values change', () => {
  const kernel = new GPU.WebGLKernel('', { output: [1] });
  let throws = false;
  kernel._webGl = {
    uniform3fv: () => {
      if (throws) new Error('This should not get called');
    },
    getUniformLocation: (name) => {
      return name;
    }
  };
  kernel.setUniform3fv('test', [1, 2, 3]);
  QUnit.assert.deepEqual(kernel.uniform3fvCache['test'], [1, 2, 3]);

  throws = true;
  kernel.setUniform3fv('test', [1, 2, 3]);
  QUnit.assert.deepEqual(kernel.uniform3fvCache['test'], [1, 2, 3]);

  throws = false;
  kernel.setUniform3fv('test', [2, 3, 4]);
  QUnit.assert.deepEqual(kernel.uniform3fvCache['test'], [2, 3, 4]);
});