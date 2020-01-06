const { assert, skip, test, module: describe, only } = require('qunit');
const { GPU } = require('../../src');

describe('features: add custom function');

function addAB(mode) {
  function customAdder(a, b) {
    return a + b;
  }
  const gpu = new GPU({mode, functions: [customAdder] });
  const kernel = gpu.createKernel(function (a, b) {
    return customAdder(a[this.thread.x], b[this.thread.x]);
  }, {
    output: [6]
  });

  const a = [1, 2, 3, 5, 6, 7];
  const b = [4, 5, 6, 1, 2, 3];

  const result = kernel(a, b);

  const expected = [5, 7, 9, 6, 8, 10];

  assert.deepEqual(Array.from(result), expected);
  gpu.destroy();
}

test('addAB auto', () => {
  addAB(null);
});

test('addAB gpu', () => {
  addAB('gpu');
});

(GPU.isWebGLSupported ? test : skip)('addAB webgl', () => {
  addAB('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('addAB webgl2', () => {
  addAB('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('addAB headlessgl', () => {
  addAB('headlessgl');
});

test('addAB cpu', () => {
  addAB('cpu');
});


describe('features: add custom function with `this.constants.width` in loop');
function sumAB(mode) {
  const gpu = new GPU({mode});

  function customAdder(a, b) {
    let sum = 0;
    for (let i = 0; i < this.constants.width; i++) {
      sum += a[this.thread.x] + b[this.thread.x];
    }
    return sum;
  }

  gpu.addFunction(customAdder);

  const kernel = gpu.createKernel(function (a, b) {
    return customAdder(a, b);
  }, {
    output: [6],
    constants: {width: 6},
    precision: 'unsigned',
  });

  assert.ok(kernel !== null, 'function generated test');

  const a = [1, 2, 3, 5, 6, 7];
  const b = [1, 1, 1, 1, 1, 1];

  const result = kernel(a, b);
  const expected = [12, 18, 24, 36, 42, 48];

  assert.deepEqual(Array.from(result), expected);
  gpu.destroy();
}

test('sumAB auto', () => {
  sumAB(null);
});

test('sumAB gpu', () => {
  sumAB('gpu');
});

(GPU.isWebGLSupported ? test : skip)('sumAB webgl', () => {
  sumAB('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('sumAB webgl2', () => {
  sumAB('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('sumAB headlessgl', () => {
  sumAB('headlessgl');
});

test('sumAB cpu', () => {
  sumAB('cpu');
});

describe('features: add custom function with `this.output.x` in loop');
function sumABThisOutputX(mode) {
  const gpu = new GPU({ mode, functions: [customAdder] });

  function customAdder(a, b) {
    let sum = 0;
    for (let i = 0; i < this.output.x; i++) {
      sum += a[this.thread.x] + b[this.thread.x];
    }
    return sum;
  }

  const kernel = gpu.createKernel(function(a, b) {
    return customAdder(a, b);
  }, {
    output : [6],
  });

  assert.ok(kernel !== null, 'function generated test');

  const a = [1, 2, 3, 5, 6, 7];
  const b = [1, 1, 1, 1, 1, 1];

  const result = kernel(a,b);
  const expected = [12, 18, 24, 36, 42, 48];

  assert.deepEqual(Array.from(result), expected);
  gpu.destroy();
}

test('sumABThisOutputX auto', () => {
  sumABThisOutputX(null);
});

test('sumABThisOutputX gpu', () => {
  sumABThisOutputX('gpu');
});

(GPU.isWebGLSupported ? test : skip)('sumABThisOutputX webgl', () => {
  sumABThisOutputX('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('sumABThisOutputX webgl2', () => {
  sumABThisOutputX('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('sumABThisOutputX headlessgl', () => {
  sumABThisOutputX('headlessgl');
});

test('sumABThisOutputX cpu', () => {
  sumABThisOutputX('cpu');
});
