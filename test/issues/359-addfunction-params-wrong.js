const { assert, skip, test, module: describe } = require('qunit');
const { GPU } = require('../../src');

describe('issue #359');

function testAddFunctionKernel(mode) {
  const gpu = new GPU({mode});
  function clcC(xx) {
    return Math.abs(xx);
  }
  function intermediate(c1) {
    return clcC(c1);
  }

  gpu.addFunction(clcC);
  gpu.addFunction(intermediate);

  const nestFunctionsKernel = gpu.createKernel(function() {
    return intermediate(-1);
  }, {
    output: [1]
  });

  assert.equal(nestFunctionsKernel()[0], 1);

  gpu.destroy();
}

(GPU.isWebGLSupported ? test : skip)('Issue #359 - addFunction calls addFunction issue webgl', () => {
  testAddFunctionKernel('webgl')
});

(GPU.isWebGL2Supported ? test : skip)('Issue #359 - addFunction calls addFunction issue webgl2', () => {
  testAddFunctionKernel('webgl2')
});

(GPU.isHeadlessGLSupported ? test : skip)('Issue #359 - addFunction calls addFunction issue headlessgl', () => {
  testAddFunctionKernel('headlessgl')
});
