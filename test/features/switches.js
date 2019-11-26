const { assert, skip, test, only, module: describe } = require('qunit');
const { GPU } = require('../../src');

describe('features: switches');

function testBasic(mode) {
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function(value) {
    switch (value) {
      case 1: return 1;
      case 2: return 2;
      case 3: return 3;
    }
    return 0;
  }, {
    argumentTypes: ['Integer'],
    output: [1],
  });
  assert.equal(kernel(1)[0], 1);
  assert.equal(kernel(2)[0], 2);
  assert.equal(kernel(3)[0], 3);
  assert.equal(kernel(4)[0], 0);
  gpu.destroy();
}

test('basic auto', () => {
  testBasic();
});

test('basic gpu', () => {
  testBasic('gpu');
});

(GPU.isWebGLSupported ? test : skip)('basic webgl', () => {
  testBasic('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('basic webgl2', () => {
  testBasic('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('basic headlessgl', () => {
  testBasic('headlessgl');
});

test('basic cpu', () => {
  testBasic('cpu');
});


function testOnlyDefault(mode) {
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function(value) {
    switch (value) {
      default: return 3;
    }
  }, {
    argumentTypes: ['Integer'],
    output: [1]
  });
  assert.equal(kernel(1)[0], 3);
  assert.equal(kernel(2)[0], 3);
  assert.equal(kernel(3)[0], 3);
  assert.equal(kernel(4)[0], 3);
  gpu.destroy();
}

test('only default auto', () => {
  testOnlyDefault();
});

test('only default gpu', () => {
  testOnlyDefault('gpu');
});

(GPU.isWebGLSupported ? test : skip)('only default webgl', () => {
  testOnlyDefault('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('only default webgl2', () => {
  testOnlyDefault('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('only default headlessgl', () => {
  testOnlyDefault('headlessgl');
});

test('only default cpu', () => {
  testOnlyDefault('cpu');
});

function testDefault(mode) {
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function(value) {
    switch (value) {
      case 1: return 1;
      case 2: return 2;
      default: return 3;
    }
  }, {
    argumentTypes: ['Integer'],
    output: [1]
  });
  assert.equal(kernel(1)[0], 1);
  assert.equal(kernel(2)[0], 2);
  assert.equal(kernel(3)[0], 3);
  assert.equal(kernel(4)[0], 3);
  gpu.destroy();
}

test('default auto', () => {
  testDefault();
});

test('default gpu', () => {
  testDefault('gpu');
});

(GPU.isWebGLSupported ? test : skip)('default webgl', () => {
  testDefault('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('default webgl2', () => {
  testDefault('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('default headlessgl', () => {
  testDefault('headlessgl');
});

test('default cpu', () => {
  testDefault('cpu');
});


function testEarlyDefault(mode) {
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function(value) {
    switch (value) {
      default: return 3;
      case 1: return 1;
      case 2: return 2;
    }
  }, {
    argumentTypes: ['Integer'],
    output: [1],
  });
  assert.equal(kernel(1)[0], 1);
  assert.equal(kernel(2)[0], 2);
  assert.equal(kernel(3)[0], 3);
  assert.equal(kernel(4)[0], 3);
  gpu.destroy();
}

test('early default auto', () => {
  testEarlyDefault();
});

test('early default gpu', () => {
  testEarlyDefault('gpu');
});

(GPU.isWebGLSupported ? test : skip)('early default webgl', () => {
  testEarlyDefault('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('early default webgl2', () => {
  testEarlyDefault('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('early default headlessgl', () => {
  testEarlyDefault('headlessgl');
});

test('early default cpu', () => {
  testEarlyDefault('cpu');
});


function testFallThrough(mode) {
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function(value) {
    switch (value) {
      case 1:
      case 2:
        return 1;
      default: return 3;
    }
  }, {
    argumentTypes: ['Integer'],
    output: [1]
  });
  assert.equal(kernel(1)[0], 1);
  assert.equal(kernel(2)[0], 1);
  assert.equal(kernel(3)[0], 3);
  assert.equal(kernel(4)[0], 3);
  gpu.destroy();
}

test('fall through auto', () => {
  testFallThrough();
});

test('fall through gpu', () => {
  testFallThrough('gpu');
});

(GPU.isWebGLSupported ? test : skip)('fall through webgl', () => {
  testFallThrough('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('fall through webgl2', () => {
  testFallThrough('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('fall through headlessgl', () => {
  testFallThrough('headlessgl');
});

test('fall through cpu', () => {
  testFallThrough('cpu');
});
