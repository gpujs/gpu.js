const { assert, skip, test, module: describe, only } = require('qunit');
const { GPU } = require('../../src');

describe('features: inject native');

function gpuAddAB(mode) {
  const gpu = new GPU({mode});
  gpu
    .injectNative(`
int customAdder(int a, int b) {
  return a + b;
}  
`)
    .addNativeFunction('customAdderLink', `int customAdderLink(int a, int b) {
  return customAdder(a, b);
}`);
  const kernel = gpu.createKernel(function (a, b) {
    return customAdderLink(a[this.thread.x], b[this.thread.x]);
  }, {
    output: [6],
    returnType: 'Integer'
  });

  const a = [1, 2, 3, 5, 6, 7];
  const b = [4, 5, 6, 1, 2, 3];

  const result = kernel(a, b);

  const expected = [5, 7, 9, 6, 8, 10];

  assert.deepEqual(Array.from(result), expected);
  gpu.destroy();
}

test('addAB auto', () => {
  gpuAddAB(null);
});

test('addAB gpu', () => {
  gpuAddAB('gpu');
});

(GPU.isWebGLSupported ? test : skip)('addAB webgl', () => {
  gpuAddAB('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('addAB webgl2', () => {
  gpuAddAB('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('addAB headlessgl', () => {
  gpuAddAB('headlessgl');
});

function cpuAddAB(mode) {
  function customAdder(a, b) {
    return a + b;
  }
  const gpu = new GPU({mode});
  gpu
    .injectNative(customAdder.toString());
  const kernel = gpu.createKernel(function (a, b) {
    return customAdder(a[this.thread.x], b[this.thread.x]);
  }, {
    output: [6],
    returnType: 'Integer'
  });

  const a = [1, 2, 3, 5, 6, 7];
  const b = [4, 5, 6, 1, 2, 3];

  const result = kernel(a, b);

  const expected = [5, 7, 9, 6, 8, 10];

  assert.deepEqual(Array.from(result), expected);
  gpu.destroy();
}

test('addAB cpu', () => {
  cpuAddAB('cpu');
});
