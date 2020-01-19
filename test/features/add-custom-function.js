const { assert, skip, test, module: describe, only } = require('qunit');
const { GPU } = require('../../src');

describe('features: add custom function');

function inGPUInstanceSettings(mode) {
  function customAdder(a, b) {
    return a + b;
  }
  const gpu = new GPU({mode, functions: [customAdder] });
  const kernel = gpu.createKernel(function (a, b) {
    return customAdder(a[this.thread.x], b[this.thread.x]);
  }, {
    output: [6]
  });

  const a = [1, 2, 3, 5, 6, 7];
  const b = [4, 5, 6, 1, 2, 3];

  const result = kernel(a, b);

  const expected = [5, 7, 9, 6, 8, 10];

  assert.deepEqual(Array.from(result), expected);
  gpu.destroy();
}

test('in GPU instance settings auto', () => {
  inGPUInstanceSettings(null);
});

test('in GPU instance settings gpu', () => {
  inGPUInstanceSettings('gpu');
});

(GPU.isWebGLSupported ? test : skip)('in GPU instance settings webgl', () => {
  inGPUInstanceSettings('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('in GPU instance settings webgl2', () => {
  inGPUInstanceSettings('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('in GPU instance settings headlessgl', () => {
  inGPUInstanceSettings('headlessgl');
});

test('in GPU instance settings cpu', () => {
  inGPUInstanceSettings('cpu');
});


function withGPUAddFunctionMethod(mode) {
  function customAdder(a, b) {
    return a + b;
  }
  const gpu = new GPU({ mode })
    .addFunction(customAdder);
  const kernel = gpu.createKernel(function (a, b) {
    return customAdder(a[this.thread.x], b[this.thread.x]);
  }, {
    output: [6]
  });

  const a = [1, 2, 3, 5, 6, 7];
  const b = [4, 5, 6, 1, 2, 3];

  const result = kernel(a, b);

  const expected = [5, 7, 9, 6, 8, 10];

  assert.deepEqual(Array.from(result), expected);
  gpu.destroy();
}

test('with GPU addFunction method auto', () => {
  withGPUAddFunctionMethod(null);
});

test('with GPU addFunction method gpu', () => {
  withGPUAddFunctionMethod('gpu');
});

(GPU.isWebGLSupported ? test : skip)('with GPU addFunction method webgl', () => {
  withGPUAddFunctionMethod('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('with GPU addFunction method webgl2', () => {
  withGPUAddFunctionMethod('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('with GPU addFunction method headlessgl', () => {
  withGPUAddFunctionMethod('headlessgl');
});

test('with GPU addFunction method cpu', () => {
  withGPUAddFunctionMethod('cpu');
});

function inKernelInstanceSettings(mode) {
  function customAdder(a, b) {
    return a + b;
  }
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function (a, b) {
    return customAdder(a[this.thread.x], b[this.thread.x]);
  }, {
    output: [6],
    functions: [
      customAdder
    ],
  });

  const a = [1, 2, 3, 5, 6, 7];
  const b = [4, 5, 6, 1, 2, 3];

  const result = kernel(a, b);

  const expected = [5, 7, 9, 6, 8, 10];

  assert.deepEqual(Array.from(result), expected);
  gpu.destroy();
}

test('in Kernel instance settings auto', () => {
  inKernelInstanceSettings(null);
});

test('in Kernel instance settings gpu', () => {
  inKernelInstanceSettings('gpu');
});

(GPU.isWebGLSupported ? test : skip)('in Kernel instance settings webgl', () => {
  inKernelInstanceSettings('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('in Kernel instance settings webgl2', () => {
  inKernelInstanceSettings('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('in Kernel instance settings headlessgl', () => {
  inKernelInstanceSettings('headlessgl');
});

test('in Kernel instance settings cpu', () => {
  inKernelInstanceSettings('cpu');
});

function withKernelAddFunctionMethod(mode) {
  function customAdder(a, b) {
    return a + b;
  }
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function (a, b) {
    return customAdder(a[this.thread.x], b[this.thread.x]);
  }, {
    output: [6]
  })
    .addFunction(customAdder);

  const a = [1, 2, 3, 5, 6, 7];
  const b = [4, 5, 6, 1, 2, 3];

  const result = kernel(a, b);

  const expected = [5, 7, 9, 6, 8, 10];

  assert.deepEqual(Array.from(result), expected);
  gpu.destroy();
}

test('with Kernel addFunction method auto', () => {
  withKernelAddFunctionMethod(null);
});

test('with Kernel addFunction method gpu', () => {
  withKernelAddFunctionMethod('gpu');
});

(GPU.isWebGLSupported ? test : skip)('with Kernel addFunction method webgl', () => {
  withKernelAddFunctionMethod('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('with Kernel addFunction method webgl2', () => {
  withKernelAddFunctionMethod('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('with Kernel addFunction method headlessgl', () => {
  withKernelAddFunctionMethod('headlessgl');
});

test('with Kernel addFunction method cpu', () => {
  withKernelAddFunctionMethod('cpu');
});

describe('features: add custom function with `this.constants.width` in loop');

function sumAB(mode) {
  const gpu = new GPU({mode});

  function customAdder(a, b) {
    let sum = 0;
    for (let i = 0; i < this.constants.width; i++) {
      sum += a[this.thread.x] + b[this.thread.x];
    }
    return sum;
  }

  gpu.addFunction(customAdder);

  const kernel = gpu.createKernel(function (a, b) {
    return customAdder(a, b);
  }, {
    output: [6],
    constants: {width: 6},
    precision: 'unsigned',
  });

  assert.ok(kernel !== null, 'function generated test');

  const a = [1, 2, 3, 5, 6, 7];
  const b = [1, 1, 1, 1, 1, 1];

  const result = kernel(a, b);
  const expected = [12, 18, 24, 36, 42, 48];

  assert.deepEqual(Array.from(result), expected);
  gpu.destroy();
}

test('sumAB auto', () => {
  sumAB(null);
});

test('sumAB gpu', () => {
  sumAB('gpu');
});

(GPU.isWebGLSupported ? test : skip)('sumAB webgl', () => {
  sumAB('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('sumAB webgl2', () => {
  sumAB('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('sumAB headlessgl', () => {
  sumAB('headlessgl');
});

test('sumAB cpu', () => {
  sumAB('cpu');
});

describe('features: add custom function with `this.output.x` in loop');
function sumABThisOutputX(mode) {
  const gpu = new GPU({ mode, functions: [customAdder] });

  function customAdder(a, b) {
    let sum = 0;
    for (let i = 0; i < this.output.x; i++) {
      sum += a[this.thread.x] + b[this.thread.x];
    }
    return sum;
  }

  const kernel = gpu.createKernel(function(a, b) {
    return customAdder(a, b);
  }, {
    output : [6],
  });

  assert.ok(kernel !== null, 'function generated test');

  const a = [1, 2, 3, 5, 6, 7];
  const b = [1, 1, 1, 1, 1, 1];

  const result = kernel(a,b);
  const expected = [12, 18, 24, 36, 42, 48];

  assert.deepEqual(Array.from(result), expected);
  gpu.destroy();
}

test('sumABThisOutputX auto', () => {
  sumABThisOutputX(null);
});

test('sumABThisOutputX gpu', () => {
  sumABThisOutputX('gpu');
});

(GPU.isWebGLSupported ? test : skip)('sumABThisOutputX webgl', () => {
  sumABThisOutputX('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('sumABThisOutputX webgl2', () => {
  sumABThisOutputX('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('sumABThisOutputX headlessgl', () => {
  sumABThisOutputX('headlessgl');
});

test('sumABThisOutputX cpu', () => {
  sumABThisOutputX('cpu');
});


describe('features: add custom private');
function addCustomPrivate(mode) {
  const gpu = new GPU({ mode });

  const kernel = gpu.createKernel(function(a, b) {
    function customAdder(a, b) {
      let sum = 0;
      for (let i = 0; i < this.output.x; i++) {
        sum += a[this.thread.x] + b[this.thread.x];
      }
      return sum;
    }
    return customAdder(a, b);
  }, {
    output : [6],
  });

  assert.ok(kernel !== null, 'function generated test');

  const a = [1, 2, 3, 5, 6, 7];
  const b = [1, 1, 1, 1, 1, 1];

  const result = kernel(a,b);
  const expected = [12, 18, 24, 36, 42, 48];

  assert.deepEqual(Array.from(result), expected);
  gpu.destroy();
}

test('auto', () => {
  addCustomPrivate(null);
});

test('gpu', () => {
  addCustomPrivate('gpu');
});

(GPU.isWebGLSupported ? test : skip)('webgl', () => {
  addCustomPrivate('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('webgl2', () => {
  addCustomPrivate('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('headlessgl', () => {
  addCustomPrivate('headlessgl');
});

test('cpu', () => {
  addCustomPrivate('cpu');
});

describe('features: setFunctions from array on kernel');

function testSetFunctionsFromArrayOnKernel(mode) {
  const gpu = new GPU({ mode });
  function custom() {
    return 1;
  }
  const kernel = gpu.createKernel(function() {
    return custom();
  }, { output: [1] });
  kernel.setFunctions([custom]);
  assert.equal(kernel()[0], 1);
  gpu.destroy();
}

test('auto', () => {
  testSetFunctionsFromArrayOnKernel();
});

test('gpu', () => {
  testSetFunctionsFromArrayOnKernel('gpu');
});

(GPU.isWebGLSupported ? test : skip)('webgl', () => {
  testSetFunctionsFromArrayOnKernel('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('webgl2', () => {
  testSetFunctionsFromArrayOnKernel('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('headlessgl', () => {
  testSetFunctionsFromArrayOnKernel('headlessgl');
});

test('cpu', () => {
  testSetFunctionsFromArrayOnKernel('cpu');
});

describe('features: setFunctions from array on kernel');

function testSetFunctionsFromArrayOnGPU(mode) {
  const gpu = new GPU({ mode });
  assert.equal(gpu.setFunctions([function custom() {
    return 1;
  }]), gpu);
  const kernel = gpu.createKernel(function() {
    return custom();
  }, { output: [1] });
  assert.equal(kernel()[0], 1);
  gpu.destroy();
}

test('auto', () => {
  testSetFunctionsFromArrayOnGPU();
});

test('gpu', () => {
  testSetFunctionsFromArrayOnGPU('gpu');
});

(GPU.isWebGLSupported ? test : skip)('webgl', () => {
  testSetFunctionsFromArrayOnGPU('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('webgl2', () => {
  testSetFunctionsFromArrayOnGPU('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('headlessgl', () => {
  testSetFunctionsFromArrayOnGPU('headlessgl');
});

test('cpu', () => {
  testSetFunctionsFromArrayOnGPU('cpu');
});

describe('features: setFunctions from array on kernel');

function testAddIGPUFunction(mode) {
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function(value) {
    return custom(value);
  })
    .setOutput([1])
    .addFunction({
      name: 'custom',
      argumentTypes: { value: 'Number' },
      source: `function custom(value) {
      return value + 1.0;
    }`,
      returnType: 'Number',
    });
  assert.equal(kernel(1)[0], 2);
  gpu.destroy();
}

test('auto', () => {
  testAddIGPUFunction();
});

test('gpu', () => {
  testAddIGPUFunction('gpu');
});

(GPU.isWebGLSupported ? test : skip)('webgl', () => {
  testAddIGPUFunction('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('webgl2', () => {
  testAddIGPUFunction('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('headlessgl', () => {
  testAddIGPUFunction('headlessgl');
});

test('cpu', () => {
  testAddIGPUFunction('cpu');
});