const { assert, skip, test, module: describe, only } = require('qunit');
const { GPU } = require('../../src');

describe('features: constants array');

function feature(mode) {
  const gpu = new GPU({ mode });
  const array = [200, 200];
  const tryConst = gpu.createKernel(function() {
    return this.constants.array[this.thread.x];
  }, {
    constants: { array },
    output: [2]
  });
  const result = tryConst();
  assert.deepEqual(Array.from(result), [200, 200], 'array constant passed test');
  gpu.destroy();
}

test('auto', () => {
  feature(null);
});

test('gpu', () => {
  feature('gpu');
});

(GPU.isWebGLSupported ? test : skip)('webgl', () => {
  feature('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('webgl2', () => {
  feature('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('headlessgl', () => {
  feature('headlessgl');
});

test('arrayConstantTest cpu', () => {
  feature('cpu');
});
