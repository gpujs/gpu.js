const { assert, skip, test, module: describe } = require('qunit');
const { GPU } = require('../../src');

describe('function return');

function functionReturn( mode ) {
  const gpu = new GPU({ mode });
  const f = gpu.createKernel(function() {
    return 42.0;
  }, {
    output : [1]
  });
  assert.ok( f !== null, "function generated test");
  assert.equal(f()[0], 42.0, "basic return function test");
  gpu.destroy();
}

test("auto", () => {
  functionReturn(null);
});

test("gpu", () => {
  functionReturn("gpu");
});

(GPU.isWebGLSupported ? test : skip)("webgl", () => {
  functionReturn("webgl");
});

(GPU.isWebGL2Supported ? test : skip)("webgl2", () => {
  functionReturn("webgl2");
});

(GPU.isHeadlessGLSupported ? test : skip)("headlessgl", () => {
  functionReturn("headlessgl");
});

test("cpu", () => {
  functionReturn("cpu");
});
