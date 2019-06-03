const { assert, skip, test, module: describe } = require('qunit');
const { GPU } = require('../../src');

describe('issue #263');

function toString(mode, context, canvas) {
  const gpu = new GPU({ mode, context, canvas });
  const kernel = gpu.createKernel(function() {
    return 1;
  }, {
    output: [1]
  });
  kernel.build();
  const string = kernel.toString();
  const kernel2 = new Function('return ' + string)()({ context, canvas });
  const result = kernel2();
  assert.equal(result[0], 1);
  gpu.destroy();
}

(GPU.isWebGLSupported ? test : skip)('Issue #263 toString single function - webgl', () => {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('webgl');
  toString('webgl', context, canvas);
});

(GPU.isWebGL2Supported ? test : skip)('Issue #263 toString single function - webgl2', () => {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('webgl2');
  toString('webgl2', context, canvas);
});

(GPU.isHeadlessGLSupported ? test : skip)('Issue #263 toString single function - headlessgl', () => {
  toString('headlessgl', require('gl')(1, 1), null);
});

test('Issue #263 toString single function - cpu', () => {
  toString('cpu');
});
