const { assert, skip, test, module: describe, only } = require('qunit');
const { GPU, WebGLFunctionNode, WebGL2FunctionNode } = require('../../src');

describe('internal: loop max');

test('loop max output webgl', () => {
  const functionNode = new WebGLFunctionNode((function(a, b) {
    let sum = 0;
    for (let i = 0; i < a; i++) {
      sum += b[this.thread.x][i];
    }
    return sum;
  }).toString(), {
    isRootKernel: true,
    name: 'kernel',
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

test('loop max output webgl2', () => {
  const functionNode = new WebGL2FunctionNode((function(a, b) {
    let sum = 0;
    for (let i = 0; i < a; i++) {
      sum += b[this.thread.x][i];
    }
    return sum;
  }).toString(), {
    isRootKernel: true,
    name: 'kernel',
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

(GPU.isWebGLSupported ? test : skip)('loop max webgl', () => {
  const gpu = new GPU({mode: 'webgl'});
  const add = gpu.createKernel(function(a, b) {
    let sum = 0;
    for (let i = 0; i < a; i++) {
      sum += b[this.thread.x][i];
    }
    return sum;
  }).setOutput([1]);

  const output = add(1, [[1]]);
  assert.equal(
    output[0],
    1
  );
  gpu.destroy();
});

(GPU.isWebGL2Supported ? test : skip)('loop max webgl2', () => {
  const gpu = new GPU({mode: 'webgl2'});
  const add = gpu.createKernel(function(a, b) {
    let sum = 0;
    for (let i = 0; i < a; i++) {
      sum += b[this.thread.x][i];
    }
    return sum;
  }).setOutput([1]);

  const output = add(1, [[1]]);
  assert.equal(
    output[0],
    1
  );
  gpu.destroy();
});

(GPU.isHeadlessGLSupported ? test : skip)('loop max headlessgl', () => {
  const gpu = new GPU({ mode: 'headlessgl' });
  const add = gpu.createKernel(function(a, b) {
    let sum = 0;
    for (let i = 0; i < a; i++) {
      sum += b[this.thread.x][i];
    }
    return sum;
  })
    .setOutput([1]);

  const output = add(1, [[1]]);
  assert.equal(
    output[0],
    1
  );
  gpu.destroy();
});

