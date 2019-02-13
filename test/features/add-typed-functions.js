const { assert, skip, test, module: describe, only } = require('qunit');
const { GPU } = require('../../src');

describe('features: add typed functions vec2Test');
function vec2Test(mode) {
  const gpu = new GPU({ mode });
  function typedFunction() {
    return [1, 2];
  }
  gpu.addFunction(typedFunction, {
    returnType: 'Array(2)'
  });
  const kernel = gpu.createKernel(function() {
    const result = typedFunction();
    return result[0] + result[1];
  })
    .setOutput([1]);

  const result = kernel();
  assert.equal(result[0], 3);
  gpu.destroy();
}

test('Array(2) - auto', () => {
  vec2Test(null);
});
test('Array(2) - gpu', () => {
  vec2Test('gpu');
});
(GPU.isWebGLSupported ? test : skip)('Array(2) - webgl', () => {
  vec2Test('webgl');
});
(GPU.isWebGL2Supported ? test : skip)('Array(2) - webgl2', () => {
  vec2Test('webgl2');
});
(GPU.isHeadlessGLSupported ? test : skip)('Array(2) - headlessgl', () => {
  vec2Test('headlessgl');
});


describe('features: add typed functions vec3Test');
function vec3Test(mode) {
  const gpu = new GPU({ mode });
  function typedFunction() {
    return [1, 2, 3];
  }
  gpu.addFunction(typedFunction, {
    returnType: 'Array(3)'
  });
  const kernel = gpu.createKernel(function() {
    const result = typedFunction();
    return result[0] + result[1] + result[2];
  })
    .setOutput([1]);
  const result = kernel();
  assert.equal(result[0], 6);
  gpu.destroy();
}

test('Array(3) - auto', () => {
  vec3Test(null);
});
test('Array(3) - gpu', () => {
  vec3Test('gpu');
});
(GPU.isWebGLSupported ? test : skip)('Array(3) - webgl', () => {
  vec3Test('webgl');
});
(GPU.isWebGL2Supported ? test : skip)('Array(3) - webgl2', () => {
  vec3Test('webgl2');
});
(GPU.isHeadlessGLSupported ? test : skip)('Array(3) - headlessgl', () => {
  vec3Test('headlessgl');
});

describe('features: add typed functions vec4Test');
function vec4Test(mode) {
  const gpu = new GPU({ mode });
  function typedFunction() {
    return [1, 2, 3, 4];
  }
  gpu.addFunction(typedFunction, {
    returnType: 'Array(4)'
  });
  const kernel = gpu.createKernel(function() {
    const result = typedFunction();
    return result[0] + result[1] + result[2] + result[3];
  })
    .setOutput([1]);
  const result = kernel();
  assert.equal(result[0], 10);
  gpu.destroy();
}

test('Array(4) - auto', () => {
  vec4Test(null);
});
test('Array(4) - gpu', () => {
  vec4Test('gpu');
});
(GPU.isWebGLSupported ? test : skip)('Array(4) - webgl', () => {
  vec4Test('webgl');
});
(GPU.isWebGL2Supported ? test : skip)('Array(4) - webgl2', () => {
  vec4Test('webgl2');
});
(GPU.isHeadlessGLSupported ? test : skip)('Array(4) - headlessgl', () => {
  vec4Test('headlessgl');
});
