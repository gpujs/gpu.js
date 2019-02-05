const { assert, skip, test, module: describe, only } = require('qunit');
const { GPU } = require('../../src');

describe('issue #147');

function missingConstant(mode) {
  const gpu = new GPU({ mode });
  function getPi() {
    return this.constants.pi;
  }
  gpu.addFunction(getPi);
  const kernel = gpu.createKernel(function() {
    return getPi();
  })
    .setOutput([1])
    .setConstants({ pi: Math.PI });

  const result = kernel();
  assert.equal(result[0].toFixed(7), Math.PI.toFixed(7));
  gpu.destroy();
}

test("Issue #147 - missing constant auto", () => {
  missingConstant(null);
});

test("Issue #147 - missing constant gpu", () => {
  missingConstant('gpu');
});

(GPU.isWebGLSupported ? test : skip)("Issue #147 - missing constant webgl", () => {
  missingConstant('webgl');
});

(GPU.isWebGL2Supported ? test : skip)("Issue #147 - missing constant webgl2", () => {
  missingConstant('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)("Issue #147 - missing constant headlessgl", () => {
  missingConstant('headlessgl');
});

test("Issue #147 - missing constant cpu", () => {
  missingConstant('cpu');
});
