const { assert, skip, test, module: describe } = require('qunit');
const { GPU } = require('../../src');

describe('if else boolean');
function ifElseBooleanTest(mode) {
  const gpu = new GPU({
    mode
  });
  const f = gpu.createKernel(function() {
    let result = 0;
    if (true) {
      result = 4;
    } else {
      result = 2;
    }
    return result;
  }, {
    output : [1]
  });

  assert.ok( f !== null, 'function generated test');
  assert.equal(f()[0], 4, 'basic return function test');
  gpu.destroy();
}

test('auto', () => {
  ifElseBooleanTest(null);
});

test('gpu', () => {
  ifElseBooleanTest('gpu');
});

(GPU.isWebGLSupported ? test : skip)('webgl', () => {
  ifElseBooleanTest('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('webgl2', () => {
  ifElseBooleanTest('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('headlessgl', () => {
  ifElseBooleanTest('headlessgl');
});

test('cpu', () => {
  ifElseBooleanTest('cpu');
});


describe('if else lookup');
function ifElseLookupTest( mode ) {
  const gpu = new GPU({ mode });
  const f = gpu.createKernel(function(x) {
    if (x[this.thread.x] > 0) {
      return 0;
    } else {
      return 1;
    }
  }, {
    output : [4]
  });

  assert.ok( f !== null, 'function generated test');
  assert.deepEqual(Array.from(f([1, 1, 0, 0])), [0, 0, 1, 1], 'basic return function test');
  gpu.destroy();
}

test('auto', () => {
  ifElseLookupTest(null);
});

test('gpu', () => {
  ifElseLookupTest('gpu');
});

(GPU.isWebGLSupported ? test : skip)('webgl', () => {
  ifElseLookupTest('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('webgl2', () => {
  ifElseLookupTest('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('headlessgl', () => {
  ifElseLookupTest('headlessgl');
});

test('cpu', () => {
  ifElseLookupTest('cpu');
});
