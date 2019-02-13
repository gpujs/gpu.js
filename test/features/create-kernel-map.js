const { assert, skip, test, module: describe } = require('qunit');
const { GPU, HeadlessGLKernel, alias } = require('../../src');

describe('features: create kernel map');
function createPropertyKernels(gpu, output) {
  function divide(v1, v2) {
    return v1 / v2;
  }
  const adder = alias('adder', function add(v1, v2) {
    return v1 + v2;
  });
  return gpu.createKernelMap({
    addResult: adder,
    divideResult: divide
  }, function (a, b, c) {
    return divide(adder(a[this.thread.x], b[this.thread.x]), c[this.thread.x]);
  }).setOutput(output);
}

function createArrayKernels(gpu, output) {
  function add(v1, v2) {
    return v1 + v2;
  }
  function divide(v1, v2) {
    return v1 / v2;
  }
  return gpu.createKernelMap([
    add, divide
  ], function (a, b, c) {
    return divide(add(a[this.thread.x], b[this.thread.x]), c[this.thread.x]);
  }).setOutput(output)
}


function createKernel(gpu, output) {
  return gpu.createKernel(function (a) {
    return a[this.thread.x];
  }).setOutput(output);
}

(GPU.isKernelMapSupported ? test : skip)('createKernelMap object 1 dimension 1 length auto', () => {
  const gpu = new GPU({mode: null});
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
});

(GPU.isKernelMapSupported ? test : skip)('createKernelMap object 1 dimension 1 length gpu', () => {
  const gpu = new GPU({mode: 'gpu'});
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
});

(GPU.isWebGLSupported ? test : skip)('createKernelMap object 1 dimension 1 length webgl', () => {
  const gpu = new GPU({mode: 'webgl'});
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
});

(GPU.isWebGL2Supported ? test : skip)('createKernelMap object 1 dimension 1 length webgl2', () => {
  const gpu = new GPU({mode: 'webgl2'});
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
});

(GPU.isHeadlessGLSupported && GPU.isKernelMapSupported ? test : skip)('createKernelMap object 1 dimension 1 length headlessgl', () => {
  const gpu = new GPU({mode: 'headlessgl'});
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
});

test('createKernelMap object 1 dimension 1 length cpu', () => {
  const gpu = new GPU({mode: 'cpu'});
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
});

(GPU.isKernelMapSupported ? test : skip)('createKernelMap array 1 dimension 1 length auto', () => {
  const gpu = new GPU({mode: null});
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
});

(GPU.isKernelMapSupported ? test : skip)('createKernelMap array 1 dimension 1 length gpu', () => {
  const gpu = new GPU({mode: 'gpu'});
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
});

(GPU.isWebGLSupported ? test : skip)('createKernelMap array 1 dimension 1 length webgl', () => {
  const gpu = new GPU({mode: 'webgl'});
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
});

(GPU.isWebGL2Supported ? test : skip)('createKernelMap array 1 dimension 1 length webgl2', () => {
  const gpu = new GPU({mode: 'webgl2'});
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
});

(GPU.isHeadlessGLSupported && GPU.isKernelMapSupported ? test : skip)('createKernelMap array 1 dimension 1 length headlessgl', () => {
  const gpu = new GPU({mode: 'headlessgl'});
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
});

test('createKernelMap array 1 dimension 1 length cpu', () => {
  const gpu = new GPU({mode: 'cpu'});
  const superKernel = createArrayKernels(gpu, [1]);
  const output = superKernel([2], [2], [0.5]);
  const result = Array.from(output.result);
  const addResult = Array.from(output[0]);
  const divideResult = Array.from(output[1]);
  assert.deepEqual(result, [8]);
  assert.deepEqual(addResult, [4]);
  assert.deepEqual(divideResult, [8]);
  gpu.destroy();
});

(GPU.isKernelMapSupported ? test : skip)('createKernelMap object 1 dimension 5 length auto', () => {
  const gpu = new GPU({mode: null});
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
});

(GPU.isKernelMapSupported ? test : skip)('createKernelMap object 1 dimension 5 length gpu', () => {
  const gpu = new GPU({mode: 'gpu'});
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
});

(GPU.isWebGLSupported ? test : skip)('createKernelMap object 1 dimension 5 length webgl', () => {
  const gpu = new GPU({mode: 'webgl'});
  const superKernel = createPropertyKernels(gpu, [5]);
  const kernel = createKernel(gpu, [5]);
  const output = superKernel([1, 2, 3, 4, 5], [1, 2, 3, 4, 5], [1, 2, 3, 4, 5]);
  const result = Array.from(output.result);
  const addResult = Array.from(kernel(output.addResult));
  const divideResult = Array.from(kernel(output.divideResult));
  assert.deepEqual(result, [2, 2, 2, 2, 2]);
  assert.deepEqual(addResult, [2, 4, 6, 8, 10]);
  assert.deepEqual(divideResult, [2, 2, 2, 2, 2]);
  gpu.destroy();
});

(GPU.isWebGL2Supported ? test : skip)('createKernelMap object 1 dimension 5 length webgl2', () => {
  const gpu = new GPU({mode: 'webgl2'});
  const superKernel = createPropertyKernels(gpu, [5]);
  const kernel = createKernel(gpu, [5]);
  const output = superKernel([1, 2, 3, 4, 5], [1, 2, 3, 4, 5], [1, 2, 3, 4, 5]);
  const result = Array.from(output.result);
  const addResult = Array.from(kernel(output.addResult));
  const divideResult = Array.from(kernel(output.divideResult));
  assert.deepEqual(result, [2, 2, 2, 2, 2]);
  assert.deepEqual(addResult, [2, 4, 6, 8, 10]);
  assert.deepEqual(divideResult, [2, 2, 2, 2, 2]);
  gpu.destroy();
});

(GPU.isHeadlessGLSupported && GPU.isKernelMapSupported ? test : skip)('createKernelMap object 1 dimension 5 length headlessgl', () => {
  const gpu = new GPU({mode: 'headlessgl'});
  const superKernel = createPropertyKernels(gpu, [5]);
  const kernel = createKernel(gpu, [5]);
  const output = superKernel([1, 2, 3, 4, 5], [1, 2, 3, 4, 5], [1, 2, 3, 4, 5]);
  const result = Array.from(output.result);
  const addResult = Array.from(kernel(output.addResult));
  const divideResult = Array.from(kernel(output.divideResult));
  assert.deepEqual(result, [2, 2, 2, 2, 2]);
  assert.deepEqual(addResult, [2, 4, 6, 8, 10]);
  assert.deepEqual(divideResult, [2, 2, 2, 2, 2]);
  gpu.destroy();
});

test('createKernelMap object 1 dimension 5 length cpu', () => {
  const gpu = new GPU({mode: 'cpu'});
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
});

(GPU.isKernelMapSupported ? test : skip)('createKernelMap array auto', () => {
  const gpu = new GPU({mode: null});
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
});

(GPU.isKernelMapSupported ? test : skip)('createKernelMap array gpu', () => {
  const gpu = new GPU({mode: 'gpu'});
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
});

(GPU.isWebGLSupported ? test : skip)('createKernelMap array webgl', () => {
  const gpu = new GPU({mode: 'webgl'});
  const superKernel = createArrayKernels(gpu, [5]);
  const kernel = createKernel(gpu, [5]);
  const output = superKernel([1, 2, 3, 4, 5], [1, 2, 3, 4, 5], [1, 2, 3, 4, 5]);
  const result = Array.from(output.result);
  const addResult = Array.from(kernel(output[0]));
  const divideResult = Array.from(kernel(output[1]));
  assert.deepEqual(result, [2, 2, 2, 2, 2]);
  assert.deepEqual(addResult, [2, 4, 6, 8, 10]);
  assert.deepEqual(divideResult, [2, 2, 2, 2, 2]);
  gpu.destroy();
});

(GPU.isWebGL2Supported ? test : skip)('createKernelMap array webgl2', () => {
  const gpu = new GPU({mode: 'webgl2'});
  const superKernel = createArrayKernels(gpu, [5]);
  const kernel = createKernel(gpu, [5]);
  const output = superKernel([1, 2, 3, 4, 5], [1, 2, 3, 4, 5], [1, 2, 3, 4, 5]);
  const result = Array.from(output.result);
  const addResult = Array.from(kernel(output[0]));
  const divideResult = Array.from(kernel(output[1]));
  assert.deepEqual(result, [2, 2, 2, 2, 2]);
  assert.deepEqual(addResult, [2, 4, 6, 8, 10]);
  assert.deepEqual(divideResult, [2, 2, 2, 2, 2]);
  gpu.destroy();
});

(GPU.isHeadlessGLSupported && GPU.isKernelMapSupported ? test : skip)('createKernelMap array headlessgl', () => {
  const gpu = new GPU({mode: 'headlessgl'});
  const superKernel = createArrayKernels(gpu, [5]);
  const kernel = createKernel(gpu, [5]);
  const output = superKernel([1, 2, 3, 4, 5], [1, 2, 3, 4, 5], [1, 2, 3, 4, 5]);
  const result = Array.from(output.result);
  const addResult = Array.from(kernel(output[0]));
  const divideResult = Array.from(kernel(output[1]));
  assert.deepEqual(result, [2, 2, 2, 2, 2]);
  assert.deepEqual(addResult, [2, 4, 6, 8, 10]);
  assert.deepEqual(divideResult, [2, 2, 2, 2, 2]);
  gpu.destroy();
});

test('createKernelMap array cpu', () => {
  const gpu = new GPU({mode: 'cpu'});
  const superKernel = createArrayKernels(gpu, [5]);
  const output = superKernel([1,2,3,4,5], [1,2,3,4,5], [1,2,3,4,5]);
  const result = Array.from(output.result);
  const addResult = Array.from(output[0]);
  const divideResult = Array.from(output[1]);
  assert.deepEqual(result, [2, 2, 2, 2, 2]);
  assert.deepEqual(addResult, [2, 4, 6, 8, 10]);
  assert.deepEqual(divideResult, [2, 2, 2, 2, 2]);
  gpu.destroy();
});

(GPU.isKernelMapSupported ? test : skip)('createKernelMap 3d auto', () => {
  const gpu = new GPU();
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
});

(GPU.isKernelMapSupported ? test : skip)('createKernelMap 3d gpu', () => {
  const gpu = new GPU({ mode: 'gpu' });
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
});

(GPU.isWebGLSupported && GPU.isKernelMapSupported ? test : skip)('createKernelMap 3d webgl', () => {
  const gpu = new GPU({mode: 'webgl'});
  function saveTarget(value) {
    return value;
  }
  const kernel = gpu.createKernelMap({
    target: saveTarget
  }, function (value) {
    return saveTarget(value);
  }).setOutput([3, 3, 3]);
  const result = kernel(1);
  const target = createKernel(gpu, [3, 3, 3])(result.target);
  assert.equal(result.result.length, 3);
  assert.equal(result.result[0].length, 3);
  assert.equal(result.result[0][0].length, 3);

  assert.equal(target.length, 3);
  assert.equal(target[0].length, 3);
  assert.equal(target[0][0].length, 3);
  gpu.destroy();
});

(GPU.isWebGL2Supported ? test : skip)('createKernelMap 3d webgl2', () => {
  const gpu = new GPU({mode: 'webgl2'});
  function saveTarget(value) {
    return value;
  }
  const kernel = gpu.createKernelMap({
    target: saveTarget
  }, function (value) {
    return saveTarget(value);
  }).setOutput([3, 3, 3]);
  const result = kernel(1);
  const target = createKernel(gpu, [3, 3, 3])(result.target);
  assert.equal(result.result.length, 3);
  assert.equal(result.result[0].length, 3);
  assert.equal(result.result[0][0].length, 3);

  assert.equal(target.length, 3);
  assert.equal(target[0].length, 3);
  assert.equal(target[0][0].length, 3);
  gpu.destroy();
});

(GPU.isHeadlessGLSupported && GPU.isKernelMapSupported ? test : skip)('createKernelMap 3d headlessgl', () => {
  const gpu = new GPU({mode: 'headlessgl'});
  function saveTarget(value) {
    return value;
  }
  const kernel = gpu.createKernelMap({
    target: saveTarget
  }, function (value) {
    return saveTarget(value);
  }).setOutput([3, 3, 3]);
  const result = kernel(1);
  const target = createKernel(gpu, [3, 3, 3])(result.target);
  assert.equal(result.result.length, 3);
  assert.equal(result.result[0].length, 3);
  assert.equal(result.result[0][0].length, 3);

  assert.equal(target.length, 3);
  assert.equal(target[0].length, 3);
  assert.equal(target[0][0].length, 3);
  gpu.destroy();
});

test('createKernelMap 3d cpu', () => {
  const gpu = new GPU({ mode: 'cpu' });
  function saveTarget(value) {
    return value;
  }
  const kernel = gpu.createKernelMap({
    target: saveTarget
  }, function(value) {
    return saveTarget(value);
  }).setOutput([3,3,3]);
  const result = kernel(1);
  assert.equal(result.result.length, 3);
  assert.equal(result.result[0].length, 3);
  assert.equal(result.result[0][0].length, 3);

  assert.equal(result.target.length, 3);
  assert.equal(result.target[0].length, 3);
  assert.equal(result.target[0][0].length, 3);
  gpu.destroy();
});
