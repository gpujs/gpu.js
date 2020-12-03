const { assert, skip, test, module: describe, only } = require('qunit');
const { GPU } = require('../../src');

describe('issue #608 - rewritten arrays');

function testRewrittenArrays(mode) {
  const gpu = new GPU({ mode });
  const kernel1 = gpu.createKernel(function (a, b) {
    return a[this.thread.y][this.thread.x];
  }, {
    constants: {
      c: [21, 23]
    },
    output: [2, 2]
  });
  const kernel2 = gpu.createKernel(function (a, b) {
    return b[this.thread.y][this.thread.x];
  }, {
    constants: {
      c: [21, 23]
    },
    output: [2, 2]
  });
  const kernel3 = gpu.createKernel(function (a, b) {
    return this.constants.c[this.thread.x];
  }, {
    constants: {
      c: [21, 23]
    },
    output: [2, 2]
  });
  const a = [
    [2, 3],
    [5, 7]
  ];
  const b = [
    [11, 13],
    [17, 19]
  ];
  const cExpected = [
    [21, 23],
    [21, 23]
  ];
  // testing twice to ensure constants are reset
  assert.deepEqual(kernel1(a, b).map(v => Array.from(v)), a);
  assert.deepEqual(kernel2(a, b).map(v => Array.from(v)), b);
  assert.deepEqual(kernel3(a, b).map(v => Array.from(v)), cExpected);

  assert.deepEqual(kernel1(a, b).map(v => Array.from(v)), a);
  assert.deepEqual(kernel2(a, b).map(v => Array.from(v)), b);
  assert.deepEqual(kernel3(a, b).map(v => Array.from(v)), cExpected);
  gpu.destroy();
}

test('auto', () => {
  testRewrittenArrays();
});

test('gpu', () => {
  testRewrittenArrays('gpu');
});

(GPU.isWebGLSupported ? test : skip)('webgl', () => {
  testRewrittenArrays('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('webgl2', () => {
  testRewrittenArrays('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('headlessgl', () => {
  testRewrittenArrays('headlessgl');
});

test('cpu', () => {
  testRewrittenArrays('cpu');
});
