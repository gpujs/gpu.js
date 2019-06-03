const { assert, skip, test, module: describe, only } = require('qunit');
const { GPU, WebGLFunctionNode, WebGL2FunctionNode } = require('../../src');

describe('internal: loop int');
test('loop int constant output webgl', () => {
  function kernel(a) {
    let sum = 0;
    for (let i = 0; i < this.constants.max; i++) {
      sum += a[this.thread.x][i];
    }
    return sum;
  }
  const functionNode = new WebGLFunctionNode(kernel.toString(), {
    isRootKernel: true,
    output: [1],
    constantTypes: {
      max: 'Integer'
    },
    argumentTypes: ['Array'],
    lookupFunctionArgumentBitRatio: () => 4,
  });
  assert.equal(
    functionNode.toString(),
    'void kernel() {' +
    '\nfloat user_sum=0.0;' +
    '\nfor (int user_i=0;(user_i<constants_max);user_i++){' +
    '\nuser_sum+=get32(user_a, user_aSize, user_aDim, 0, threadId.x, user_i);}' +
    '\n' +
    '\nkernelResult = user_sum;return;' +
    '\n}');
});

test('loop int constant output webgl2', () => {
  function kernel(a) {
    let sum = 0;
    for (let i = 0; i < this.constants.max; i++) {
      sum += a[this.thread.x][i];
    }
    return sum;
  }
  const functionNode = new WebGL2FunctionNode(kernel.toString(), {
    isRootKernel: true,
    output: [1],
    constantTypes: { max: 'Integer' },
    argumentTypes: ['Array'],
    lookupFunctionArgumentBitRatio: () => 4,
  });
  assert.equal(
    functionNode.toString(),
    'void kernel() {' +
    '\nfloat user_sum=0.0;' +
    '\nfor (int user_i=0;(user_i<constants_max);user_i++){' +
    '\nuser_sum+=get32(user_a, user_aSize, user_aDim, 0, threadId.x, user_i);}' +
    '\n' +
    '\nkernelResult = user_sum;return;' +
    '\n}');
});

(GPU.isWebGLSupported ? test : skip)('loop int constant webgl', () => {
  function kernel(a) {
    let sum = 0;
    for (let i = 0; i < this.constants.max; i++) {
      sum += a[this.thread.x][i];
    }
    return sum;
  }
  const gpu = new GPU({ mode: 'webgl' });
  const output = gpu.createKernel(kernel, {
    constants: { max: 3 },
    output: [1]
  })([[1,2,3]]);

  assert.equal(
    output,
    6
  );
  gpu.destroy();
});

(GPU.isWebGL2Supported ? test : skip)('loop int constant webgl2', () => {
  function kernel(a) {
    let sum = 0;
    for (let i = 0; i < this.constants.max; i++) {
      sum += a[this.thread.x][i];
    }
    return sum;
  }
  const gpu = new GPU({ mode: 'webgl2' });
  const output = gpu.createKernel(kernel, {
    constants: { max: 3 },
    output: [1]
  })([[1,2,3]]);

  assert.equal(
    output,
    6
  );
  gpu.destroy();
});

(GPU.isHeadlessGLSupported ? test : skip)('loop int constant headlessgl', () => {
  function kernel(a) {
    let sum = 0;
    for (let i = 0; i < this.constants.max; i++) {
      sum += a[this.thread.x][i];
    }
    return sum;
  }
  const gpu = new GPU({ mode: 'headlessgl' });
  const output = gpu.createKernel(kernel, {
    constants: { max: 3 },
    output: [1]
  })([[1,2,3]]);

  assert.equal(
    output,
    6
  );
  gpu.destroy();
});

test('loop int literal output webgl', () => {
  function kernel(a) {
    let sum = 0;
    for (let i = 0; i < 10; i++) {
      sum += a[this.thread.x][i];
    }
    return sum;
  }
  const functionNode = new WebGLFunctionNode(kernel.toString(), {
    isRootKernel: true,
    output: [1],
    argumentTypes: ['Array'],
    lookupFunctionArgumentBitRatio: () => 4,
  });
  assert.equal(
    functionNode.toString(),
    'void kernel() {' +
    '\nfloat user_sum=0.0;' +
    '\nfor (int user_i=0;(user_i<10);user_i++){' +
    '\nuser_sum+=get32(user_a, user_aSize, user_aDim, 0, threadId.x, user_i);}' +
    '\n' +
    '\nkernelResult = user_sum;return;' +
    '\n}');
});

test('loop int literal output webgl2', () => {
  function kernel(a) {
    let sum = 0;
    for (let i = 0; i < 10; i++) {
      sum += a[this.thread.x][i];
    }
    return sum;
  }
  const functionNode = new WebGL2FunctionNode(kernel.toString(), {
    isRootKernel: true,
    output: [1],
    argumentTypes: ['Array'],
    lookupFunctionArgumentBitRatio: () => 4,
  });
  assert.equal(
    functionNode.toString(),
    'void kernel() {' +
    '\nfloat user_sum=0.0;' +
    '\nfor (int user_i=0;(user_i<10);user_i++){' +
    '\nuser_sum+=get32(user_a, user_aSize, user_aDim, 0, threadId.x, user_i);}' +
    '\n' +
    '\nkernelResult = user_sum;return;' +
    '\n}');
});

(GPU.isWebGLSupported ? test : skip)('loop int literal webgl', () => {
  function kernel(a) {
    let sum = 0;
    for (let i = 0; i < 3; i++) {
      sum += a[this.thread.x][i];
    }
    return sum;
  }
  const gpu = new GPU({ mode: 'webgl' });
  const output = gpu.createKernel(kernel, { output: [1] })([[1,2,3]]);
  assert.equal(
    output,
    6
  );
  gpu.destroy();
});

(GPU.isWebGL2Supported ? test : skip)('loop int literal webgl2', () => {
  function kernel(a) {
    let sum = 0;
    for (let i = 0; i < 3; i++) {
      sum += a[this.thread.x][i];
    }
    return sum;
  }
  const gpu = new GPU({ mode: 'webgl2' });
  const output = gpu.createKernel(kernel, { output: [1] })([[1,2,3]]);
  assert.equal(
    output,
    6
  );
  gpu.destroy();
});

(GPU.isHeadlessGLSupported ? test : skip)('loop int literal headlessgl', () => {
  function kernel(a) {
    let sum = 0;
    for (let i = 0; i < 3; i++) {
      sum += a[this.thread.x][i];
    }
    return sum;
  }
  const gpu = new GPU({ mode: 'headlessgl' });
  const output = gpu.createKernel(kernel, { output: [1] })([[1,2,3]]);
  assert.equal(
    output,
    6
  );
  gpu.destroy();
});

test('loop int parameter output webgl', () => {
  function kernel(a, b) {
    let sum = 0;
    for (let i = 0; i < a; i++) {
      sum += b[this.thread.x][i];
    }
    return sum;
  }
  const functionNode = new WebGLFunctionNode(kernel.toString(), {
    isRootKernel: true,
    output: [1],
    argumentTypes: ['Number', 'Array'],
    lookupFunctionArgumentBitRatio: () => 4
  });
  assert.equal(
    functionNode.toString(),
    'void kernel() {' +
    '\nfloat user_sum=0.0;' +
    '\nint user_i=0;' +
    '\nfor (int safeI=0;safeI<LOOP_MAX;safeI++){' +
    '\nif (!(user_i<int(user_a))) break;' +
    '\nuser_sum+=get32(user_b, user_bSize, user_bDim, 0, threadId.x, user_i);' +
    '\nuser_i++;}' +
    '\n' +
    '\nkernelResult = user_sum;return;' +
    '\n}');
});

test('loop int parameter output webgl2', () => {
  function kernel(a, b) {
    let sum = 0;
    for (let i = 0; i < a; i++) {
      sum += b[this.thread.x][i];
    }
    return sum;
  }
  const functionNode = new WebGL2FunctionNode(kernel.toString(), {
    isRootKernel: true,
    output: [1],
    argumentTypes: ['Number', 'Array'],
    lookupFunctionArgumentBitRatio: () => 4,
  });
  assert.equal(
    functionNode.toString(),
    'void kernel() {' +
    '\nfloat user_sum=0.0;' +
    '\nint user_i=0;' +
    '\nfor (int safeI=0;safeI<LOOP_MAX;safeI++){' +
    '\nif (!(user_i<int(user_a))) break;' +
    '\nuser_sum+=get32(user_b, user_bSize, user_bDim, 0, threadId.x, user_i);' +
    '\nuser_i++;}' +
    '\n' +
    '\nkernelResult = user_sum;return;' +
    '\n}');
});

(GPU.isWebGLSupported ? test : skip)('loop int parameter webgl', () => {
  function kernel(a, b) {
    let sum = 0;
    for (let i = 0; i < a; i++) {
      sum += b[this.thread.x][i];
    }
    return sum;
  }
  const gpu = new GPU({ mode: 'webgl' });
  const output = gpu.createKernel(kernel, { output: [1] })(3, [[1,2,3]]);
  assert.equal(
    output,
    6
  );
  gpu.destroy();
});

(GPU.isWebGL2Supported ? test : skip)('loop int parameter webgl2', () => {
  function kernel(a, b) {
    let sum = 0;
    for (let i = 0; i < a; i++) {
      sum += b[this.thread.x][i];
    }
    return sum;
  }
  const gpu = new GPU({ mode: 'webgl2' });
  const output = gpu.createKernel(kernel, { output: [1] })(3, [[1,2,3]]);
  assert.equal(
    output,
    6
  );
  gpu.destroy();
});

(GPU.isHeadlessGLSupported ? test : skip)('loop int parameter headlessgl', () => {
  function kernel(a, b) {
    let sum = 0;
    for (let i = 0; i < a; i++) {
      sum += b[this.thread.x][i];
    }
    return sum;
  }
  const gpu = new GPU({ mode: 'headlessgl' });
  const output = gpu.createKernel(kernel, { output: [1] })(3, [[1,2,3]]);
  assert.equal(
    output,
    6
  );
  gpu.destroy();
});

(GPU.isWebGLSupported ? test : skip)('loop int dynamic output webgl', () => {
  function kernel(a) {
    let sum = 0;
    for (let i = 0; i < this.output.x; i++) {
      sum += a[this.thread.x][i];
    }
    return sum;
  }
  const gpu = new GPU({ mode: 'webgl' });
  const output = gpu.createKernel(kernel, {
    dynamicOutput: true,
    output: [1],
  })([[3]]);

  assert.deepEqual(
    Array.from(output),
    [3]
  );
  gpu.destroy();
});

(GPU.isWebGL2Supported ? test : skip)('loop int dynamic output webgl2', () => {
  function kernel(a) {
    let sum = 0;
    for (let i = 0; i < this.output.x; i++) {
      sum += a[this.thread.x][i];
    }
    return sum;
  }
  const gpu = new GPU({ mode: 'webgl2' });
  const output = gpu.createKernel(kernel, {
    dynamicOutput: true,
    output: [1]
  })([[3]]);

  assert.deepEqual(
    Array.from(output),
    [3]
  );
  gpu.destroy();
});

(GPU.isHeadlessGLSupported ? test : skip)('loop int dynamic output headlessgl', () => {
  function kernel(a) {
    let sum = 0;
    for (let i = 0; i < this.output.x; i++) {
      sum += a[this.thread.x][i];
    }
    return sum;
  }
  const gpu = new GPU({ mode: 'headlessgl' });
  const output = gpu.createKernel(kernel, {
    dynamicOutput: true,
    output: [1],
  })([[3]]);

  assert.deepEqual(
    Array.from(output),
    [3]
  );
  gpu.destroy();
});
