const { assert, skip, test, module: describe, only } = require('qunit');
const { GPU } = require('../../src');

describe('internal: underscores');

function testNumberArgument(mode) {
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function(value_1) {
    return value_1;
  }, { output: [1], });
  assert.equal(kernel(1)[0], 1);
  gpu.destroy();
}

test('number argument auto', () => {
  testNumberArgument();
});
test('number argument gpu', () => {
  testNumberArgument('gpu');
});
(GPU.isWebGLSupported ? test : skip)('number argument webgl', () => {
  testNumberArgument('webgl');
});
(GPU.isWebGL2Supported ? test : skip)('number argument webgl2', () => {
  testNumberArgument('webgl2');
});
(GPU.isHeadlessGLSupported ? test : skip)('number argument headlessgl', () => {
  testNumberArgument('headlessgl');
});
test('number argument cpu', () => {
  testNumberArgument('cpu');
});

function testArrayArgument(mode) {
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function(value_1) {
    return value_1[this.thread.x];
  }, { output: [1], });
  assert.equal(kernel([1])[0], 1);
  gpu.destroy();
}

test('array argument auto', () => {
  testArrayArgument();
});
test('array argument gpu', () => {
  testArrayArgument('gpu');
});
(GPU.isWebGLSupported ? test : skip)('array argument webgl', () => {
  testArrayArgument('webgl');
});
(GPU.isWebGL2Supported ? test : skip)('array argument webgl2', () => {
  testArrayArgument('webgl2');
});
(GPU.isHeadlessGLSupported ? test : skip)('array argument headlessgl', () => {
  testArrayArgument('headlessgl');
});
test('array argument cpu', () => {
  testArrayArgument('cpu');
});

function testTextureArgument(mode) {
  const gpu = new GPU({ mode });
  const texture = gpu.createKernel(function() { return 1; }, { output: [1], pipeline: true })();
  const kernel = gpu.createKernel(function(value_1) {
    return value_1[this.thread.x];
  }, { output: [1], });
  assert.equal(kernel(texture)[0], 1);
  gpu.destroy();
}

test('texture argument auto', () => {
  testTextureArgument();
});
test('texture argument gpu', () => {
  testTextureArgument('gpu');
});
(GPU.isWebGLSupported ? test : skip)('texture argument webgl', () => {
  testTextureArgument('webgl');
});
(GPU.isWebGL2Supported ? test : skip)('texture argument webgl2', () => {
  testTextureArgument('webgl2');
});
(GPU.isHeadlessGLSupported ? test : skip)('texture argument headlessgl', () => {
  testTextureArgument('headlessgl');
});
test('texture argument cpu', () => {
  testTextureArgument('cpu');
});


function testArray2TextureArgument(mode) {
  const gpu = new GPU({ mode });
  const texture = gpu.createKernel(function() { return [1, 1]; }, { output: [1], pipeline: true })();
  const kernel = gpu.createKernel(function(value_1) {
    debugger;
    return value_1[this.thread.x];
  }, { output: [1], });
  assert.deepEqual(kernel(texture)[0], new Float32Array([1, 1]));
  gpu.destroy();
}

test('array2 texture argument auto', () => {
  testArray2TextureArgument();
});
test('array2 texture argument gpu', () => {
  testArray2TextureArgument('gpu');
});
(GPU.isWebGLSupported ? test : skip)('array2 texture argument webgl', () => {
  testArray2TextureArgument('webgl');
});
(GPU.isWebGL2Supported ? test : skip)('array2 texture argument webgl2', () => {
  testArray2TextureArgument('webgl2');
});
(GPU.isHeadlessGLSupported ? test : skip)('array2 texture argument headlessgl', () => {
  testArray2TextureArgument('headlessgl');
});


function testNumberConstant(mode) {
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function() {
    return this.constants.value_1;
  }, {
    output: [1],
    constants: {
      value_1: 1
    },
  });
  assert.equal(kernel()[0], 1);
  gpu.destroy();
}

test('number constant auto', () => {
  testNumberConstant();
});
test('number constant gpu', () => {
  testNumberConstant('gpu');
});
(GPU.isWebGLSupported ? test : skip)('number constant webgl', () => {
  testNumberConstant('webgl');
});
(GPU.isWebGL2Supported ? test : skip)('number constant webgl2', () => {
  testNumberConstant('webgl2');
});
(GPU.isHeadlessGLSupported ? test : skip)('number constant headlessgl', () => {
  testNumberConstant('headlessgl');
});
test('number constant cpu', () => {
  testNumberConstant('cpu');
});

function testArrayConstant(mode) {
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function() {
    return this.constants.value_1[0];
  }, {
    output: [1],
    constants: {
      value_1: [1]
    },
  });
  assert.equal(kernel()[0], 1);
  gpu.destroy();
}

test('array constant auto', () => {
  testArrayConstant();
});
test('array constant gpu', () => {
  testArrayConstant('gpu');
});
(GPU.isWebGLSupported ? test : skip)('array constant webgl', () => {
  testArrayConstant('webgl');
});
(GPU.isWebGL2Supported ? test : skip)('array constant webgl2', () => {
  testArrayConstant('webgl2');
});
(GPU.isHeadlessGLSupported ? test : skip)('array constant headlessgl', () => {
  testArrayConstant('headlessgl');
});
test('array constant cpu', () => {
  testArrayConstant('cpu');
});


function testTextureConstant(mode) {
  const gpu = new GPU({ mode });
  const texture = gpu.createKernel(function() { return 1; }, { output: [1], pipeline: true })();
  const kernel = gpu.createKernel(function() {
    return this.constants.value_1[0];
  }, {
    output: [1],
    constants: {
      value_1: texture
    },
  });
  assert.equal(kernel()[0], 1);
  gpu.destroy();
}

test('texture constant auto', () => {
  testTextureConstant();
});
test('texture constant gpu', () => {
  testTextureConstant('gpu');
});
(GPU.isWebGLSupported ? test : skip)('texture constant webgl', () => {
  testTextureConstant('webgl');
});
(GPU.isWebGL2Supported ? test : skip)('texture constant webgl2', () => {
  testTextureConstant('webgl2');
});
(GPU.isHeadlessGLSupported ? test : skip)('texture constant headlessgl', () => {
  testTextureConstant('headlessgl');
});

