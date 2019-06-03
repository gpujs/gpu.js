const { assert, skip, test, module: describe, only } = require('qunit');
const { GPU } = require('../../src');

describe('features: CPU with Textures');

function cpuWithTexturesNumberWithSinglePrecision(mode) {
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function() {
    return this.thread.x;
  }, {
    output: [2],
    pipeline: true,
    precision: 'single',
  });
  const texture = kernel();
  assert.ok(texture.toArray);
  assert.deepEqual(Array.from(texture.toArray()), [0, 1]);
  const cpu = new GPU({ mode: 'cpu' });
  const cpuKernel = cpu.createKernel(function(v) {
    return v[this.thread.x];
  }, { output: [2] });
  assert.notOk(cpuKernel.kernel.textureCache);
  const result = cpuKernel(texture);
  assert.ok(cpuKernel.kernel.textureCache);
  assert.deepEqual(Array.from(result), [0, 1]);
  let calledTwice = false;
  texture.toArray = () => {
    calledTwice = true;
  };
  assert.deepEqual(Array.from(cpuKernel(texture)), [0, 1]);
  assert.equal(calledTwice, false);
  gpu.destroy();
}

(GPU.isGPUSupported && GPU.isSinglePrecisionSupported ? test : skip)('number with single precision auto', () => {
  cpuWithTexturesNumberWithSinglePrecision();
});

(GPU.isGPUSupported && GPU.isSinglePrecisionSupported ? test : skip)('number with single precision gpu', () => {
  cpuWithTexturesNumberWithSinglePrecision('gpu');
});

(GPU.isWebGLSupported && GPU.isSinglePrecisionSupported ? test : skip)('number with single precision webgl', () => {
  cpuWithTexturesNumberWithSinglePrecision('webgl');
});

(GPU.isWebGL2Supported && GPU.isSinglePrecisionSupported ? test : skip)('number with single precision webgl2', () => {
  cpuWithTexturesNumberWithSinglePrecision('webgl2');
});

(GPU.isHeadlessGLSupported && GPU.isSinglePrecisionSupported ? test : skip)('number with single precision headlessgl', () => {
  cpuWithTexturesNumberWithSinglePrecision('headlessgl');
});

function cpuWithTexturesMemoryOptimizedNumberWithSinglePrecision(mode) {
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function() {
    return this.thread.x;
  }, {
    output: [2],
    pipeline: true,
    precision: 'single',
    optimizeFloatMemory: true,
  });
  const texture = kernel();
  assert.ok(texture.toArray);
  assert.deepEqual(Array.from(texture.toArray()), [0, 1]);
  const cpu = new GPU({ mode: 'cpu' });
  const cpuKernel = cpu.createKernel(function(v) {
    return v[this.thread.x];
  }, { output: [2] });
  assert.notOk(cpuKernel.kernel.textureCache);
  const result = cpuKernel(texture);
  assert.ok(cpuKernel.kernel.textureCache);
  assert.deepEqual(Array.from(result), [0, 1]);
  let calledTwice = false;
  texture.toArray = () => {
    calledTwice = true;
  };
  assert.deepEqual(Array.from(cpuKernel(texture)), [0, 1]);
  assert.equal(calledTwice, false);
  gpu.destroy();
}

(GPU.isGPUSupported && GPU.isSinglePrecisionSupported ? test : skip)('memory optimized number with single precision auto', () => {
  cpuWithTexturesMemoryOptimizedNumberWithSinglePrecision();
});

(GPU.isGPUSupported && GPU.isSinglePrecisionSupported ? test : skip)('memory optimized number with single precision gpu', () => {
  cpuWithTexturesMemoryOptimizedNumberWithSinglePrecision('gpu');
});

(GPU.isWebGLSupported && GPU.isSinglePrecisionSupported ? test : skip)('memory optimized number with single precision webgl', () => {
  cpuWithTexturesMemoryOptimizedNumberWithSinglePrecision('webgl');
});

(GPU.isWebGL2Supported && GPU.isSinglePrecisionSupported ? test : skip)('memory optimized number with single precision webgl2', () => {
  cpuWithTexturesMemoryOptimizedNumberWithSinglePrecision('webgl2');
});

(GPU.isHeadlessGLSupported && GPU.isSinglePrecisionSupported ? test : skip)('memory optimized number with single precision headlessgl', () => {
  cpuWithTexturesMemoryOptimizedNumberWithSinglePrecision('headlessgl');
});

function cpuWithTexturesArray2WithSinglePrecision(mode) {
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function() {
    return [this.thread.x, this.thread.x];
  }, {
    output: [2],
    pipeline: true,
    precision: 'single',
  });
  const texture = kernel();
  assert.ok(texture.toArray);
  assert.deepEqual(texture.toArray().map(value => Array.from(value)), [[0,0], [1,1]]);
  const cpu = new GPU({ mode: 'cpu' });
  const cpuKernel = cpu.createKernel(function(v) {
    return v[this.thread.x];
  }, { output: [2] });
  assert.notOk(cpuKernel.kernel.textureCache);
  const result = cpuKernel(texture);
  assert.ok(cpuKernel.kernel.textureCache);
  assert.deepEqual(result.map(value => Array.from(value)), [[0,0], [1,1]]);
  let calledTwice = false;
  texture.toArray = () => {
    calledTwice = true;
  };
  assert.deepEqual(cpuKernel(texture).map(value => Array.from(value)), [[0,0], [1,1]]);
  assert.equal(calledTwice, false);
  gpu.destroy();
}

(GPU.isGPUSupported && GPU.isSinglePrecisionSupported ? test : skip)('Array(2) with single precision auto', () => {
  cpuWithTexturesArray2WithSinglePrecision();
});

(GPU.isGPUSupported && GPU.isSinglePrecisionSupported ? test : skip)('Array(2) with single precision gpu', () => {
  cpuWithTexturesArray2WithSinglePrecision('gpu');
});

(GPU.isWebGLSupported && GPU.isSinglePrecisionSupported ? test : skip)('Array(2) with single precision webgl', () => {
  cpuWithTexturesArray2WithSinglePrecision('webgl');
});

(GPU.isWebGL2Supported && GPU.isSinglePrecisionSupported ? test : skip)('Array(2) with single precision webgl2', () => {
  cpuWithTexturesArray2WithSinglePrecision('webgl2');
});

(GPU.isHeadlessGLSupported && GPU.isSinglePrecisionSupported ? test : skip)('Array(2) with single precision headlessgl', () => {
  cpuWithTexturesArray2WithSinglePrecision('headlessgl');
});

function cpuWithTexturesArray3WithSinglePrecision(mode) {
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function() {
    return [this.thread.x, this.thread.x, this.thread.x];
  }, {
    output: [2],
    pipeline: true,
    precision: 'single',
  });
  const texture = kernel();
  assert.ok(texture.toArray);
  assert.deepEqual(texture.toArray().map(value => Array.from(value)), [[0,0,0], [1,1,1]]);
  const cpu = new GPU({ mode: 'cpu' });
  const cpuKernel = cpu.createKernel(function(v) {
    return v[this.thread.x];
  }, { output: [2] });
  assert.notOk(cpuKernel.kernel.textureCache);
  const result = cpuKernel(texture);
  assert.ok(cpuKernel.kernel.textureCache);
  assert.deepEqual(result.map(value => Array.from(value)), [[0,0,0], [1,1,1]]);
  let calledTwice = false;
  texture.toArray = () => {
    calledTwice = true;
  };
  assert.deepEqual(cpuKernel(texture).map(value => Array.from(value)), [[0,0,0], [1,1,1]]);
  assert.equal(calledTwice, false);
  gpu.destroy();
}

(GPU.isGPUSupported && GPU.isSinglePrecisionSupported ? test : skip)('Array(3) with single precision auto', () => {
  cpuWithTexturesArray3WithSinglePrecision();
});

(GPU.isGPUSupported && GPU.isSinglePrecisionSupported ? test : skip)('Array(3) with single precision gpu', () => {
  cpuWithTexturesArray3WithSinglePrecision('gpu');
});

(GPU.isWebGLSupported && GPU.isSinglePrecisionSupported ? test : skip)('Array(3) with single precision webgl', () => {
  cpuWithTexturesArray3WithSinglePrecision('webgl');
});

(GPU.isWebGL2Supported && GPU.isSinglePrecisionSupported ? test : skip)('Array(3) with single precision webgl2', () => {
  cpuWithTexturesArray3WithSinglePrecision('webgl2');
});

(GPU.isHeadlessGLSupported && GPU.isSinglePrecisionSupported ? test : skip)('Array(3) with single precision headlessgl', () => {
  cpuWithTexturesArray3WithSinglePrecision('headlessgl');
});

function cpuWithTexturesArray4WithSinglePrecision(mode) {
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function() {
    return [this.thread.x, this.thread.x, this.thread.x, this.thread.x];
  }, {
    output: [2],
    pipeline: true,
    precision: 'single',
  });
  const texture = kernel();
  assert.ok(texture.toArray);
  assert.deepEqual(texture.toArray().map(value => Array.from(value)), [[0,0,0,0], [1,1,1,1]]);
  const cpu = new GPU({ mode: 'cpu' });
  const cpuKernel = cpu.createKernel(function(v) {
    return v[this.thread.x];
  }, { output: [2] });
  assert.notOk(cpuKernel.kernel.textureCache);
  const result = cpuKernel(texture);
  assert.ok(cpuKernel.kernel.textureCache);
  assert.deepEqual(result.map(value => Array.from(value)), [[0,0,0,0], [1,1,1,1]]);
  let calledTwice = false;
  texture.toArray = () => {
    calledTwice = true;
  };
  assert.deepEqual(cpuKernel(texture).map(value => Array.from(value)), [[0,0,0,0], [1,1,1,1]]);
  assert.equal(calledTwice, false);
  gpu.destroy();
}

(GPU.isGPUSupported && GPU.isSinglePrecisionSupported ? test : skip)('Array(4) with single precision auto', () => {
  cpuWithTexturesArray4WithSinglePrecision();
});

(GPU.isGPUSupported && GPU.isSinglePrecisionSupported ? test : skip)('Array(4) with single precision gpu', () => {
  cpuWithTexturesArray4WithSinglePrecision('gpu');
});

(GPU.isWebGLSupported && GPU.isSinglePrecisionSupported ? test : skip)('Array(4) with single precision webgl', () => {
  cpuWithTexturesArray4WithSinglePrecision('webgl');
});

(GPU.isWebGL2Supported && GPU.isSinglePrecisionSupported ? test : skip)('Array(4) with single precision webgl2', () => {
  cpuWithTexturesArray4WithSinglePrecision('webgl2');
});

(GPU.isHeadlessGLSupported && GPU.isSinglePrecisionSupported ? test : skip)('Array(4) with single precision headlessgl', () => {
  cpuWithTexturesArray4WithSinglePrecision('headlessgl');
});

function cpuWithTexturesNumberWithUnsignedPrecision(mode) {
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function() {
    return this.thread.x;
  }, {
    output: [2],
    pipeline: true,
    precision: 'unsigned',
  });
  const texture = kernel();
  assert.ok(texture.toArray);
  assert.deepEqual(Array.from(texture.toArray()), [0, 1]);
  const cpu = new GPU({ mode: 'cpu' });
  const cpuKernel = cpu.createKernel(function(v) {
    return v[this.thread.x];
  }, { output: [2] });
  assert.notOk(cpuKernel.kernel.textureCache);
  const result = cpuKernel(texture);
  assert.ok(cpuKernel.kernel.textureCache);
  assert.deepEqual(Array.from(result), [0, 1]);
  let calledTwice = false;
  texture.toArray = () => {
    calledTwice = true;
  };
  assert.deepEqual(Array.from(cpuKernel(texture)), [0, 1]);
  assert.equal(calledTwice, false);
  gpu.destroy();
}

(GPU.isGPUSupported && GPU.isSinglePrecisionSupported ? test : skip)('number with unsigned precision auto', () => {
  cpuWithTexturesNumberWithUnsignedPrecision();
});

(GPU.isGPUSupported && GPU.isSinglePrecisionSupported ? test : skip)('number with unsigned precision gpu', () => {
  cpuWithTexturesNumberWithUnsignedPrecision('gpu');
});

(GPU.isWebGLSupported && GPU.isSinglePrecisionSupported ? test : skip)('number with unsigned precision webgl', () => {
  cpuWithTexturesNumberWithUnsignedPrecision('webgl');
});

(GPU.isWebGL2Supported && GPU.isSinglePrecisionSupported ? test : skip)('number with unsigned precision webgl2', () => {
  cpuWithTexturesNumberWithUnsignedPrecision('webgl2');
});

(GPU.isHeadlessGLSupported && GPU.isSinglePrecisionSupported ? test : skip)('number with unsigned precision headlessgl', () => {
  cpuWithTexturesNumberWithUnsignedPrecision('headlessgl');
});
