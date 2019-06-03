const { assert, skip, test, module: describe, only } = require('qunit');
const { GPU, alias } = require('../../src');

describe('features: create kernel map');
function createPropertyKernels(gpu, output) {
  function divide(d1, d2) {
    return d1 / d2;
  }
  const adder = alias('adder', function add(a1, a2) {
    return a1 + a2;
  });
  return gpu.createKernelMap({
    addResult: adder,
    divideResult: divide
  }, function (k1, k2, k3) {
    return divide(adder(k1[this.thread.x], k2[this.thread.x]), k3[this.thread.x]);
  }).setOutput(output);
}

function createArrayKernels(gpu, output) {
  function add(a1, a2) {
    return a1 + a2;
  }
  function divide(d1, d2) {
    return d1 / d2;
  }
  return gpu.createKernelMap([
    add, divide
  ], function (k1, k2, k3) {
    return divide(add(k1[this.thread.x], k2[this.thread.x]), k3[this.thread.x]);
  }).setOutput(output)
}


function createKernel(gpu, output) {
  return gpu.createKernel(function (a) {
    return a[this.thread.x];
  }).setOutput(output);
}

function createKernelMapObject1Dimension1Length(mode) {
  const gpu = new GPU({ mode });
  const superKernel = createPropertyKernels(gpu, [1]);
  const kernel = createKernel(gpu, [1]);
  const output = superKernel([2], [2], [0.5]);
  const result = Array.from(output.result);
  const addResult = Array.from(kernel(output.addResult));
  const divideResult = Array.from(kernel(output.divideResult));
  assert.deepEqual(result, [8]);
  assert.deepEqual(addResult, [4]);
  assert.deepEqual(divideResult, [8]);
  gpu.destroy();
}

(GPU.isKernelMapSupported ? test : skip)('createKernelMap object 1 dimension 1 length auto', () => {
  createKernelMapObject1Dimension1Length();
});

(GPU.isKernelMapSupported ? test : skip)('createKernelMap object 1 dimension 1 length gpu', () => {
  createKernelMapObject1Dimension1Length('gpu');
});

(GPU.isWebGLSupported ? test : skip)('createKernelMap object 1 dimension 1 length webgl', () => {
  createKernelMapObject1Dimension1Length('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('createKernelMap object 1 dimension 1 length webgl2', () => {
  createKernelMapObject1Dimension1Length('webgl2');
});

(GPU.isHeadlessGLSupported && GPU.isKernelMapSupported ? test : skip)('createKernelMap object 1 dimension 1 length headlessgl', () => {
  createKernelMapObject1Dimension1Length('headlessgl');
});

test('createKernelMap object 1 dimension 1 length cpu', () => {
  createKernelMapObject1Dimension1Length('cpu');
});


function createKernelMapArray1Dimension1Length(mode) {
  const gpu = new GPU({ mode });
  const superKernel = createArrayKernels(gpu, [1]);
  const kernel = createKernel(gpu, [1]);
  const output = superKernel([2], [2], [0.5]);
  const result = Array.from(output.result);
  const addResult = Array.from(kernel(output[0]));
  const divideResult = Array.from(kernel(output[1]));
  assert.deepEqual(result, [8]);
  assert.deepEqual(addResult, [4]);
  assert.deepEqual(divideResult, [8]);
  gpu.destroy();
}

(GPU.isKernelMapSupported ? test : skip)('createKernelMap array 1 dimension 1 length auto', () => {
  createKernelMapArray1Dimension1Length();
});

(GPU.isKernelMapSupported ? test : skip)('createKernelMap array 1 dimension 1 length gpu', () => {
  createKernelMapArray1Dimension1Length('gpu');
});

(GPU.isWebGLSupported ? test : skip)('createKernelMap array 1 dimension 1 length webgl', () => {
  createKernelMapArray1Dimension1Length('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('createKernelMap array 1 dimension 1 length webgl2', () => {
  createKernelMapArray1Dimension1Length('webgl2');
});

(GPU.isHeadlessGLSupported && GPU.isKernelMapSupported ? test : skip)('createKernelMap array 1 dimension 1 length headlessgl', () => {
  createKernelMapArray1Dimension1Length('headlessgl');
});

test('createKernelMap array 1 dimension 1 length cpu', () => {
  createKernelMapArray1Dimension1Length('cpu');
});


function createKernelMapObject1Dimension5Length(mode) {
  const gpu = new GPU({ mode });
  const superKernel = createPropertyKernels(gpu, [5]);
  const kernel = createKernel(gpu, [5]);
  const output = superKernel([1,2,3,4,5], [1,2,3,4,5], [1,2,3,4,5]);
  const result = Array.from(output.result);
  const addResult = Array.from(kernel(output.addResult));
  const divideResult = Array.from(kernel(output.divideResult));
  assert.deepEqual(result, [2, 2, 2, 2, 2]);
  assert.deepEqual(addResult, [2, 4, 6, 8, 10]);
  assert.deepEqual(divideResult, [2, 2, 2, 2, 2]);
  gpu.destroy();
}

(GPU.isKernelMapSupported ? test : skip)('createKernelMap object 1 dimension 5 length auto', () => {
  createKernelMapObject1Dimension5Length();
});

(GPU.isKernelMapSupported ? test : skip)('createKernelMap object 1 dimension 5 length gpu', () => {
  createKernelMapObject1Dimension5Length('gpu');
});

(GPU.isWebGLSupported ? test : skip)('createKernelMap object 1 dimension 5 length webgl', () => {
  createKernelMapObject1Dimension5Length('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('createKernelMap object 1 dimension 5 length webgl2', () => {
  createKernelMapObject1Dimension5Length('webgl2');
});

(GPU.isHeadlessGLSupported && GPU.isKernelMapSupported ? test : skip)('createKernelMap object 1 dimension 5 length headlessgl', () => {
  createKernelMapObject1Dimension5Length('headlessgl');
});

test('createKernelMap object 1 dimension 5 length cpu', () => {
  createKernelMapObject1Dimension5Length('cpu');
});


function createKernelMapArrayAuto(mode) {
  const gpu = new GPU({mode});
  const superKernel = createArrayKernels(gpu, [5]);
  const kernel = createKernel(gpu, [5]);
  const output = superKernel([1,2,3,4,5], [1,2,3,4,5], [1,2,3,4,5]);
  const result = Array.from(output.result);
  const addResult = Array.from(kernel(output[0]));
  const divideResult = Array.from(kernel(output[1]));
  assert.deepEqual(result, [2, 2, 2, 2, 2]);
  assert.deepEqual(addResult, [2, 4, 6, 8, 10]);
  assert.deepEqual(divideResult, [2, 2, 2, 2, 2]);
  gpu.destroy();
}
(GPU.isKernelMapSupported ? test : skip)('createKernelMap array auto', () => {
  createKernelMapArrayAuto();
});

(GPU.isKernelMapSupported ? test : skip)('createKernelMap array gpu', () => {
  createKernelMapArrayAuto('gpu');
});

(GPU.isWebGLSupported ? test : skip)('createKernelMap array webgl', () => {
  createKernelMapArrayAuto('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('createKernelMap array webgl2', () => {
  createKernelMapArrayAuto('webgl2');
});

(GPU.isHeadlessGLSupported && GPU.isKernelMapSupported ? test : skip)('createKernelMap array headlessgl', () => {
  createKernelMapArrayAuto('headlessgl');
});

test('createKernelMap array cpu', () => {
  createKernelMapArrayAuto('cpu');
});

function createKernelMap3DAuto(mode) {
  const gpu = new GPU({ mode });
  function saveTarget(value) {
    return value;
  }
  const kernel = gpu.createKernelMap({
    target: saveTarget
  }, function(value) {
    return saveTarget(value);
  }).setOutput([3,3,3]);
  const result = kernel(1);
  const target = createKernel(gpu, [3,3,3])(result.target);
  assert.equal(result.result.length, 3);
  assert.equal(result.result[0].length, 3);
  assert.equal(result.result[0][0].length, 3);

  assert.equal(target.length, 3);
  assert.equal(target[0].length, 3);
  assert.equal(target[0][0].length, 3);
  gpu.destroy();
}

(GPU.isKernelMapSupported ? test : skip)('createKernelMap 3d auto', () => {
  createKernelMap3DAuto();
});

(GPU.isKernelMapSupported ? test : skip)('createKernelMap 3d gpu', () => {
  createKernelMap3DAuto('gpu');
});

(GPU.isWebGLSupported && GPU.isKernelMapSupported ? test : skip)('createKernelMap 3d webgl', () => {
  createKernelMap3DAuto('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('createKernelMap 3d webgl2', () => {
  createKernelMap3DAuto('webgl2');
});

(GPU.isHeadlessGLSupported && GPU.isKernelMapSupported ? test : skip)('createKernelMap 3d headlessgl', () => {
  createKernelMap3DAuto('headlessgl');
});

test('createKernelMap 3d cpu', () => {
  createKernelMap3DAuto('cpu');
});
