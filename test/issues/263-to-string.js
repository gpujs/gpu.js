const { assert, skip, test, module: describe } = require('qunit');
const { GPU } = require('../../src');

describe('issue #263');

function toString(mode) {
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function() {
    return 1;
  }, {
    output: [1]
  });
  kernel.build();
  const string = kernel.toString();
  const kernel2 = eval(string)();
  const result = kernel2
    .setContext(kernel.context)
    .setCanvas(kernel.canvas)();

  assert.equal(result[0], 1);
  gpu.destroy();
}

test('Issue #263 toString single function - auto', () => {
  toString();
});

test('Issue #263 toString single function - gpu', () => {
  toString('gpu');
});

(GPU.isWebGLSupported ? test : skip)('Issue #263 toString single function - webgl', () => {
  toString('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('Issue #263 toString single function - webgl2', () => {
  toString('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('Issue #263 toString single function - headlessgl', () => {
  toString('headlessgl');
});

test('Issue #263 toString single function - cpu', () => {
  toString('cpu');
});
