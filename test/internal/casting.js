const { assert, skip, test, module: describe, only } = require('qunit');
const { GPU } = require('../../src');

describe('internal: casting');

function castingOffsetByThreadXAndOutputX(mode) {
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function (value) {
    // value will be a number
    // this.thread.x is an integer
    // this.output.x is treated as a literal, so can be either integer or float
    // return value will be float
    return this.thread.x + (this.output.x * value);
  }, {
    output: [1],
    strictIntegers: true,
  });
  const result = kernel(1);
  assert.equal(result[0], 1);
  assert.deepEqual(kernel.argumentTypes, ['Integer']);
  gpu.destroy();
}

(GPU.isWebGLSupported ? test : skip)('casting offset by this.thread.x and this.output.x webgl', () => {
  castingOffsetByThreadXAndOutputX('webgl');
});
(GPU.isWebGL2Supported ? test : skip)('casting offset by this.thread.x and this.output.x webgl2', () => {
  castingOffsetByThreadXAndOutputX('webgl2');
});
(GPU.isHeadlessGLSupported ? test : skip)('casting offset by this.thread.x and this.output.x headlessgl', () => {
  castingOffsetByThreadXAndOutputX('headlessgl');
});

function handleCastingIntsWithNativeFunctions(mode) {
  const gpu = new GPU({ mode });
  gpu.addNativeFunction('add', `
    int add(int value1, int value2) {
      return value1 + value2;
    }
  `);
  const kernel = gpu.createKernel(function(value1, value2) {
    return add(value1, value2);
  }, { output: [1] });
  const result = kernel(0.5, 2.5);
  assert.deepEqual(Array.from(result), [2]);
  assert.deepEqual(kernel.argumentTypes, ['Float', 'Float']);
  gpu.destroy();
}

(GPU.isWebGLSupported ? test : skip)('handle casting ints with native functions webgl', () => {
  handleCastingIntsWithNativeFunctions('webgl');
});
(GPU.isWebGL2Supported ? test : skip)('handle casting ints with native functions webgl2', () => {
  handleCastingIntsWithNativeFunctions('webgl2');
});
(GPU.isHeadlessGLSupported ? test : skip)('handle casting ints with native functions headlessgl', () => {
  handleCastingIntsWithNativeFunctions('headlessgl');
});


function handleCastingFloatsWithNativeFunctions(mode) {
  const gpu = new GPU({ mode });
  gpu.addNativeFunction('add', `
    float add(float value1, float value2) {
      return value1 + value2;
    }
  `);
  const kernel = gpu.createKernel(function(value1, value2) {
    return add(value1, value2);
  }, {
    argumentTypes: ['Integer', 'Integer'],
    output: [1],
    strictIntegers: true,
  });
  const result = kernel(1, 2);
  assert.deepEqual(Array.from(result), [3]);
  assert.deepEqual(kernel.argumentTypes, ['Integer', 'Integer']);
  gpu.destroy();
}

(GPU.isWebGLSupported ? test : skip)('handle casting floats with native functions webgl', () => {
  handleCastingFloatsWithNativeFunctions('webgl');
});
(GPU.isWebGL2Supported ? test : skip)('handle casting floats with native functions webgl2', () => {
  handleCastingFloatsWithNativeFunctions('webgl2');
});
(GPU.isHeadlessGLSupported ? test : skip)('handle casting floats with native functions headlessgl', () => {
  handleCastingFloatsWithNativeFunctions('headlessgl');
});


function handleCastingMixedWithNativeFunctions(mode) {
  const gpu = new GPU({ mode });
  gpu.addNativeFunction('add', `
    float add(float value1, int value2) {
      return value1 + float(value2);
    }
  `);
  const kernel = gpu.createKernel(function(value1, value2) {
    return add(value1, value2);
  }, {
    output: [1],
    strictIntegers: true,
  });
  const result = kernel(1, 2.5);
  assert.deepEqual(Array.from(result), [3]);
  assert.deepEqual(kernel.argumentTypes, ['Integer', 'Float']);
  gpu.destroy();
}

(GPU.isWebGLSupported ? test : skip)('handle casting mixed with native functions webgl', () => {
  handleCastingMixedWithNativeFunctions('webgl');
});
(GPU.isWebGL2Supported ? test : skip)('handle casting mixed with native functions webgl2', () => {
  handleCastingMixedWithNativeFunctions('webgl2');
});
(GPU.isHeadlessGLSupported ? test : skip)('handle casting mixed with native functions headlessgl', () => {
  handleCastingMixedWithNativeFunctions('headlessgl');
});

function handleCastingFloat(mode) {
  const gpu = new GPU({ mode });
  function add(value1, value2) {
    return value1 + value2;
  }
  gpu.addFunction(add, {
    argumentTypes: ['Float', 'Float'],
    returnType: 'Float'
  });
  const kernel = gpu.createKernel(function(value1, value2) {
    return add(value1, value2);
  }, {
    output: [1],
    argumentTypes: ['Integer', 'Integer'],
  });
  const result = kernel(1, 2);
  assert.equal(result[0], 3);
  gpu.destroy();
}

(GPU.isWebGLSupported ? test : skip)('handle casting float webgl', () => {
  handleCastingFloat('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('handle casting float webgl2', () => {
  handleCastingFloat('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('handle casting float headlessgl', () => {
  handleCastingFloat('headlessgl');
});


function handleCastingBeforeReturn(mode) {
  const gpu = new GPU({ mode });
  function addOne(v) {
    return v + v;
  }
  gpu.addFunction(addOne, {
    argumentTypes: { v: 'Float' },
    returnType: 'Integer',
  });
  const kernel = gpu.createKernel(function(v) {
    return addOne(v);
  }, { output: [1] });
  assert.equal(kernel(1)[0], 2);
  gpu.destroy();
}

(GPU.isWebGLSupported ? test : skip)('handle casting before return webgl', () => {
  handleCastingBeforeReturn('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('handle casting before return webgl2', () => {
  handleCastingBeforeReturn('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('handle casting before return headlessgl', () => {
  handleCastingBeforeReturn('headlessgl');
});
