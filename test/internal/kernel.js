const { assert, test, module: describe, skip } = require('qunit');
const { GPU, CPUKernel, WebGLKernel, WebGL2Kernel, HeadlessGLKernel } = require('../../src');

describe('internal: kernel');

const mockGl = {
  COMPILE_STATUS: 'COMPILE_STATUS',
  enable: () => {},
  viewport: () => {},
  createShader: () => {},
  shaderSource: () => {},
  compileShader: () => {},
  getShaderParameter: (shader, prop) => {
    if (prop === 'COMPILE_STATUS') return true;
  },
  getShaderInfoLog: () => {},
  createProgram: () => {},
  attachShader: () => {},
  linkProgram: () => {},
  createFramebuffer: () => { return {}; },
  createBuffer: () => { return {}; },
  bindFramebuffer: () => {},
  bindBuffer: () => {},
  bufferData: () => {},
  bufferSubData: () => {},
  getAttribLocation: () => Math.random(),
  enableVertexAttribArray: () => {},
  vertexAttribPointer: () => {},
  createTexture: () => {},
  activeTexture: () => {},
  bindTexture: () => {},
  texParameteri: () => {},
  texImage2D: () => {},
  framebufferTexture2D: () => {},
  deleteBuffer: () => {},
  deleteFramebuffer: () => {},
  getExtension: () => true
};

test('CPUKernel argumentTypes', () => {
  const kernel = new CPUKernel(`function(value) { return value[this.thread.x]; }`, {
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
});

test('WebGLKernel argumentTypes', () => {
  const kernel = new WebGLKernel(`function(value) { return value[this.thread.x]; }`, {
    skipValidate: true,
    output: [1],
    canvas: {},
    context: mockGl,
    functionBuilder: {
      addKernel: function() {},
      addFunctions: function() {},
      getPrototypes: function() { return []; },
      addNativeFunctions: function() {},
      getPrototypeString: function() { return 'void kernel() {}'; }
    },
  });
  kernel.build([1]);
  assert.equal(kernel.argumentTypes.length, 1);
  assert.equal(kernel.argumentTypes[0], 'Array');
  kernel.destroy();
});

test('WebGL2Kernel argumentTypes', () => {
  const kernel = new WebGL2Kernel(`function(value) { return value[this.thread.x]; }`, {
    skipValidate: true,
    output: [1],
    canvas: {},
    context: mockGl,
    functionBuilder: {
      addKernel: function() {},
      addFunctions: function() {},
      getPrototypes: function() { return []; },
      addNativeFunctions: function() {},
      getPrototypeString: function() { return 'void kernel() {}'; }
    },
  });
  kernel.build([1]);
  assert.equal(kernel.argumentTypes.length, 1);
  assert.equal(kernel.argumentTypes[0], 'Array');
  kernel.destroy();
});

(GPU.isHeadlessGLSupported ? test : skip)('HeadlessGLKernel argumentTypes', () => {
  const kernel = new HeadlessGLKernel(`function(value) { return value[this.thread.x]; }`, {
    output: [1],
    context: mockGl,
    functionBuilder: {
      addKernel: function() {},
      addFunctions: function() {},
      getPrototypes: function() { return []; },
      addNativeFunctions: function() {},
      getPrototypeString: function() { return 'void kernel() {}'; }
    },
  });
  kernel.build([1]);
  assert.equal(kernel.argumentTypes.length, 1);
  assert.equal(kernel.argumentTypes[0], 'Array');
  kernel.destroy();
});

test('WebGLKernel.setUniform1f only calls webgl when values change', () => {
  const canvas = {};
  const context = {
    uniform1f: () => {
      if (throws) new Error('This should not get called');
    },
    getUniformLocation: (name) => {
      return name;
    }
  };
  const kernel = new WebGLKernel('function() {}', { canvas, context, output: [1] });
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
});
test('WebGL2Kernel.setUniform1f only calls webgl when values change', () => {
  const canvas = {};
  const context = {
    uniform1f: () => {
      if (throws) new Error('This should not get called');
    },
    getUniformLocation: (name) => {
      return name;
    }
  };
  const kernel = new WebGL2Kernel('function() {}', { context, canvas, output: [1] });
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
});
(GPU.isHeadlessGLSupported ? test : skip)('HeadlessGLKernel.setUniform1f only calls webgl when values change', () => {
  const kernel = new HeadlessGLKernel('function() {}', { output: [1] });
  let throws = false;
  kernel.context = {
    uniform1f: () => {
      if (throws) new Error('This should not get called');
    },
    getUniformLocation: (name) => {
      return name;
    }
  };
  kernel.setUniform1f('test', 1);
  assert.equal(kernel.uniform1fCache['test'], 1);

  throws = true;
  kernel.setUniform1f('test', 1);
  assert.equal(kernel.uniform1fCache['test'], 1);

  throws = false;
  kernel.setUniform1f('test', 2);
  assert.equal(kernel.uniform1fCache['test'], 2);
  kernel.destroy();
});
test('WebGLKernel.setUniform1i only calls webgl when values change', () => {
  const canvas = {};
  const context = {
    uniform1i: () => {
      if (throws) new Error('This should not get called');
    },
    getUniformLocation: (name) => {
      return name;
    }
  };
  const kernel = new WebGLKernel('function() {}', { canvas, context, output: [1] });
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
});
test('WebGL2Kernel.setUniform1i only calls webgl when values change', () => {
  const canvas = {};
  const context = {
    uniform1i: () => {
      if (throws) new Error('This should not get called');
    },
    getUniformLocation: (name) => {
      return name;
    }
  };
  const kernel = new WebGL2Kernel('function() {}', { canvas, context, output: [1] });
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
});
(GPU.isHeadlessGLSupported ? test : skip)('HeadlessGLKernel.setUniform1i only calls webgl when values change', () => {
  const kernel = new HeadlessGLKernel('function() {}', { output: [1] });
  let throws = false;
  kernel.context = {
    uniform1i: () => {
      if (throws) new Error('This should not get called');
    },
    getUniformLocation: (name) => {
      return name;
    }
  };
  kernel.setUniform1i('test', 1);
  assert.equal(kernel.uniform1iCache['test'], 1);

  throws = true;
  kernel.setUniform1i('test', 1);
  assert.equal(kernel.uniform1iCache['test'], 1);

  throws = false;
  kernel.setUniform1i('test', 2);
  assert.equal(kernel.uniform1iCache['test'], 2);
  kernel.destroy();
});
test('WebGLKernel.setUniform2f only calls webgl when values change', () => {
  const canvas = {};
  const context = {
    uniform2f: () => {
      if (throws) new Error('This should not get called');
    },
    getUniformLocation: (name) => {
      return name;
    }
  };
  const kernel = new WebGLKernel('function() {}', { canvas, context, output: [1] });
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
});
test('WebGL2Kernel.setUniform2f only calls webgl when values change', () => {
  const canvas = {};
  const context = {
    uniform2f: () => {
      if (throws) new Error('This should not get called');
    },
    getUniformLocation: (name) => {
      return name;
    }
  };
  const kernel = new WebGL2Kernel('function() {}', { canvas, context, output: [1] });
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
});
(GPU.isHeadlessGLSupported ? test : skip)('HeadlessGLKernel.setUniform2f only calls webgl when values change', () => {
  const kernel = new HeadlessGLKernel('function() {}', { output: [1] });
  let throws = false;
  kernel.context = {
    uniform2f: () => {
      if (throws) new Error('This should not get called');
    },
    getUniformLocation: (name) => {
      return name;
    }
  };
  kernel.setUniform2f('test', 1, 2);
  assert.deepEqual(kernel.uniform2fCache['test'], [1, 2]);

  throws = true;
  kernel.setUniform2f('test', 1, 2);
  assert.deepEqual(kernel.uniform2fCache['test'], [1, 2]);

  throws = false;
  kernel.setUniform2f('test', 3, 4);
  assert.deepEqual(kernel.uniform2fCache['test'], [3, 4]);
  kernel.destroy();
});
test('WebGLKernel.setUniform2fv only calls webgl when values change', () => {
  const canvas = {};
  const context = {
    uniform2fv: () => {
      if (throws) new Error('This should not get called');
    },
    getUniformLocation: (name) => {
      return name;
    }
  };
  const kernel = new WebGLKernel('function() {}', { canvas, context, output: [1] });
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
});
test('WebGL2Kernel.setUniform2fv only calls webgl when values change', () => {
  const canvas = {};
  const context = {
    uniform2fv: () => {
      if (throws) new Error('This should not get called');
    },
    getUniformLocation: (name) => {
      return name;
    }
  };
  const kernel = new WebGL2Kernel('function() {}', { canvas, context, output: [1] });
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
});
test('HeadlessGLKernel.setUniform2fv only calls webgl when values change', () => {
  const context = {
    uniform2fv: () => {
      if (throws) new Error('This should not get called');
    },
    getUniformLocation: (name) => {
      return name;
    }
  };
  const kernel = new HeadlessGLKernel('function() {}', { context, output: [1] });
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
});
test('WebGLKernel.setUniform3fv only calls webgl when values change', () => {
  const canvas = {};
  const context = {
    uniform3fv: () => {
      if (throws) new Error('This should not get called');
    },
    getUniformLocation: (name) => {
      return name;
    }
  };
  const kernel = new WebGLKernel('function() {}', { canvas, context, output: [1] });
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
});
test('WebGL2Kernel.setUniform3fv only calls webgl when values change', () => {
  const canvas = {};
  const context = {
    uniform3fv: () => {
      if (throws) new Error('This should not get called');
    },
    getUniformLocation: (name) => {
      return name;
    }
  };
  const kernel = new WebGL2Kernel('function() {}', { canvas, context, output: [1] });
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
});
test('HeadlessGLKernel.setUniform3fv only calls webgl when values change', () => {
  const context = {
    uniform3fv: () => {
      if (throws) new Error('This should not get called');
    },
    getUniformLocation: (name) => {
      return name;
    }
  };
  const kernel = new HeadlessGLKernel('function() {}', { context, output: [1] });
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
});
