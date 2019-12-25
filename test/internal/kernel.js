const { assert, test, module: describe, skip } = require('qunit');
const { GPU, CPUKernel, WebGLKernel, WebGL2Kernel, HeadlessGLKernel } = require('../../src');

describe('internal: kernel');

/**
 *
 * @param {Kernel} Kernel
 */
function argumentTypesTest(Kernel) {
  const kernel = new Kernel(`function(value) { return value[this.thread.x]; }`, {
    output: [1],
    functionBuilder: {
      addKernel: function() {},
      addFunctions: function() {},
      getPrototypes: function() { return []; },
      addNativeFunctions: function() {}
    },
  });
  kernel.build([1]);
  assert.equal(kernel.argumentTypes.length, 1);
  assert.equal(kernel.argumentTypes[0], 'Array');
  kernel.destroy();
}

test('CPUKernel argumentTypes', () => {
  argumentTypesTest(CPUKernel);
});

(GPU.isWebGLSupported ? test : skip)('WebGLKernel argumentTypes', () => {
  argumentTypesTest(WebGLKernel);
});

(GPU.isWebGL2Supported ? test : skip)('WebGL2Kernel argumentTypes', () => {
  argumentTypesTest(WebGL2Kernel);
});

(GPU.isHeadlessGLSupported ? test : skip)('HeadlessGLKernel argumentTypes', () => {
  argumentTypesTest(HeadlessGLKernel);
});

/**
 *
 * @param {Kernel} Kernel
 */
function setUniform1fTest(Kernel) {
  const canvas = {};
  const context = {
    uniform1f: () => {
      if (throws) new Error('This should not get called');
    },
    getUniformLocation: (name) => {
      return name;
    }
  };
  const kernel = new Kernel('function() {}', { canvas, context, output: [1] });
  let throws = false;
  kernel.setUniform1f('test', 1);
  assert.equal(kernel.uniform1fCache['test'], 1);

  throws = true;
  kernel.setUniform1f('test', 1);
  assert.equal(kernel.uniform1fCache['test'], 1);

  throws = false;
  kernel.setUniform1f('test', 2);
  assert.equal(kernel.uniform1fCache['test'], 2);
  kernel.destroy();
}

test('WebGLKernel.setUniform1f only calls context when values change', () => {
  setUniform1fTest(WebGLKernel);
});
test('WebGL2Kernel.setUniform1f only calls context when values change', () => {
  setUniform1fTest(WebGL2Kernel);
});
(GPU.isHeadlessGLSupported ? test : skip)('HeadlessGLKernel.setUniform1f only calls context when values change', () => {
  setUniform1fTest(HeadlessGLKernel);
});

/**
 *
 * @param {Kernel} Kernel
 */
function setUniform1iTest(Kernel) {
  const canvas = {};
  const context = {
    uniform1i: () => {
      if (throws) new Error('This should not get called');
    },
    getUniformLocation: (name) => {
      return name;
    }
  };
  const kernel = new Kernel('function() {}', { canvas, context, output: [1] });
  let throws = false;
  kernel.setUniform1i('test', 1);
  assert.equal(kernel.uniform1iCache['test'], 1);

  throws = true;
  kernel.setUniform1i('test', 1);
  assert.equal(kernel.uniform1iCache['test'], 1);

  throws = false;
  kernel.setUniform1i('test', 2);
  assert.equal(kernel.uniform1iCache['test'], 2);
  kernel.destroy();
}

test('WebGLKernel.setUniform1i only calls context when values change', () => {
  setUniform1iTest(WebGLKernel);
});
test('WebGL2Kernel.setUniform1i only calls context when values change', () => {
  setUniform1iTest(WebGL2Kernel);
});
(GPU.isHeadlessGLSupported ? test : skip)('HeadlessGLKernel.setUniform1i only calls context when values change', () => {
  setUniform1iTest(HeadlessGLKernel);
});

/**
 *
 * @param {Kernel} Kernel
 */
function setUniform2fTest(Kernel) {
  const canvas = {};
  const context = {
    uniform2f: () => {
      if (throws) new Error('This should not get called');
    },
    getUniformLocation: (name) => {
      return name;
    }
  };
  const kernel = new Kernel('function() {}', { canvas, context, output: [1] });
  let throws = false;
  kernel.setUniform2f('test', 1, 2);
  assert.deepEqual(kernel.uniform2fCache['test'], [1, 2]);

  throws = true;
  kernel.setUniform2f('test', 1, 2);
  assert.deepEqual(kernel.uniform2fCache['test'], [1, 2]);

  throws = false;
  kernel.setUniform2f('test', 3, 4);
  assert.deepEqual(kernel.uniform2fCache['test'], [3, 4]);
  kernel.destroy();
}
test('WebGLKernel.setUniform2f only calls context when values change', () => {
  setUniform2fTest(WebGLKernel);
});
test('WebGL2Kernel.setUniform2f only calls context when values change', () => {
  setUniform2fTest(WebGL2Kernel);
});
(GPU.isHeadlessGLSupported ? test : skip)('HeadlessGLKernel.setUniform2f only calls context when values change', () => {
  setUniform2fTest(HeadlessGLKernel);
});

/**
 *
 * @param {Kernel} Kernel
 */
function setUniform2fvTest(Kernel) {
  const canvas = {};
  const context = {
    uniform2fv: () => {
      if (throws) new Error('This should not get called');
    },
    getUniformLocation: (name) => {
      return name;
    }
  };
  const kernel = new Kernel('function() {}', { canvas, context, output: [1] });
  let throws = false;
  kernel.setUniform2fv('test', [1, 2]);
  assert.deepEqual(kernel.uniform2fvCache['test'], [1, 2]);

  throws = true;
  kernel.setUniform2fv('test', [1, 2]);
  assert.deepEqual(kernel.uniform2fvCache['test'], [1, 2]);

  throws = false;
  kernel.setUniform2fv('test', [2, 3]);
  assert.deepEqual(kernel.uniform2fvCache['test'], [2, 3]);
  kernel.destroy();
}
test('WebGLKernel.setUniform2fv only calls context when values change', () => {
  setUniform2fvTest(WebGLKernel);
});
test('WebGL2Kernel.setUniform2fv only calls context when values change', () => {
  setUniform2fvTest(WebGL2Kernel);
});
test('HeadlessGLKernel.setUniform2fv only calls context when values change', () => {
  setUniform2fvTest(HeadlessGLKernel);
});

/**
 *
 * @param {Kernel} Kernel
 */
function setUniform3fvTest(Kernel) {
  const canvas = {};
  const context = {
    uniform3fv: () => {
      if (throws) new Error('This should not get called');
    },
    getUniformLocation: (name) => {
      return name;
    }
  };
  const kernel = new Kernel('function() {}', { canvas, context, output: [1] });
  let throws = false;
  kernel.setUniform3fv('test', [1, 2, 3]);
  assert.deepEqual(kernel.uniform3fvCache['test'], [1, 2, 3]);

  throws = true;
  kernel.setUniform3fv('test', [1, 2, 3]);
  assert.deepEqual(kernel.uniform3fvCache['test'], [1, 2, 3]);

  throws = false;
  kernel.setUniform3fv('test', [2, 3, 4]);
  assert.deepEqual(kernel.uniform3fvCache['test'], [2, 3, 4]);
  kernel.destroy();
}
test('WebGLKernel.setUniform3fv only calls context when values change', () => {
  setUniform3fvTest(WebGLKernel);
});
test('WebGL2Kernel.setUniform3fv only calls context when values change', () => {
  setUniform3fvTest(WebGL2Kernel);
});
test('HeadlessGLKernel.setUniform3fv only calls context when values change', () => {
  setUniform3fvTest(HeadlessGLKernel);
});

/**
 *
 * @param {Kernel} Kernel
 */
function setUniform4ivTest(Kernel) {
  const canvas = {};
  const context = {
    uniform4iv: () => {
      if (throws) new Error('This should not get called');
    },
    getUniformLocation: (name) => {
      return name;
    }
  };
  const kernel = new Kernel('function() {}', { canvas, context, output: [1] });
  let throws = false;
  kernel.setUniform4iv('test', [1, 2, 3, 4]);
  assert.deepEqual(kernel.uniform4ivCache['test'], [1, 2, 3, 4]);

  throws = true;
  kernel.setUniform4iv('test', [1, 2, 3, 4]);
  assert.deepEqual(kernel.uniform4ivCache['test'], [1, 2, 3, 4]);

  throws = false;
  kernel.setUniform4iv('test', [2, 3, 4, 5]);
  assert.deepEqual(kernel.uniform4ivCache['test'], [2, 3, 4, 5]);
  kernel.destroy();
}
test('WebGLKernel.setUniform4iv only calls context when values change', () => {
  setUniform4ivTest(WebGLKernel);
});
test('WebGL2Kernel.setUniform4iv only calls context when values change', () => {
  setUniform4ivTest(WebGL2Kernel);
});
test('HeadlessGLKernel.setUniform4iv only calls context when values change', () => {
  setUniform4ivTest(HeadlessGLKernel);
});

/**
 *
 * @param {Kernel} Kernel
 */
function setUniform4fvTest(Kernel) {
  const canvas = {};
  const context = {
    uniform4fv: () => {
      if (throws) new Error('This should not get called');
    },
    getUniformLocation: (name) => {
      return name;
    }
  };
  const kernel = new Kernel('function() {}', { canvas, context, output: [1] });
  let throws = false;
  kernel.setUniform4fv('test', [1, 2, 3, 4]);
  assert.deepEqual(kernel.uniform4fvCache['test'], [1, 2, 3, 4]);

  throws = true;
  kernel.setUniform4fv('test', [1, 2, 3, 4]);
  assert.deepEqual(kernel.uniform4fvCache['test'], [1, 2, 3, 4]);

  throws = false;
  kernel.setUniform4fv('test', [2, 3, 4, 5]);
  assert.deepEqual(kernel.uniform4fvCache['test'], [2, 3, 4, 5]);
  kernel.destroy();
}
test('WebGLKernel.setUniform4fv only calls context when values change', () => {
  setUniform4fvTest(WebGLKernel);
});
test('WebGL2Kernel.setUniform4fv only calls context when values change', () => {
  setUniform4fvTest(WebGL2Kernel);
});
test('HeadlessGLKernel.setUniform4fv only calls context when values change', () => {
  setUniform4fvTest(HeadlessGLKernel);
});
