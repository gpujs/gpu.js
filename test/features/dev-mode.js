const { assert, skip, test, module: describe, only } = require('qunit');
const { GPU, input } = require('../../src');

describe('features: dev mode');

test('are added to GPU instance .kernels property', () => {
  const gpu = new GPU({ mode: 'dev' });
  const kernel = gpu.createKernel(function(value) {
    return value;
  }, { output: [1] });
  assert.equal(gpu.kernels.length, 1);
  assert.deepEqual(kernel(1), new Float32Array([1]));
  gpu.destroy();
});

test('works with integer', () => {
  const gpu = new GPU({ mode: 'dev' });
  const kernel = gpu.createKernel(function(value) {
    return value;
  }, { output: [1] });
  assert.deepEqual(kernel(1), new Float32Array([1]));
  gpu.destroy();
});

test('works with float', () => {
  const gpu = new GPU({ mode: 'dev' });
  const kernel = gpu.createKernel(function(value) {
    return value;
  }, { output: [1] });
  assert.deepEqual(kernel(1.5), new Float32Array([1.5]));
  gpu.destroy();
});

test('works with array', () => {
  const gpu = new GPU({ mode: 'dev' });
  const kernel = gpu.createKernel(function(value) {
    return value[this.thread.x];
  }, { output: [4] });
  assert.deepEqual(kernel([1,2,3,4]), new Float32Array([1,2,3,4]));
  gpu.destroy();
});

test('works with matrix', () => {
  const gpu = new GPU({ mode: 'dev' });
  const kernel = gpu.createKernel(function(value) {
    return value[this.thread.y][this.thread.x];
  }, { output: [4, 2] });
  assert.deepEqual(kernel(
    [
      [1,2,3,4],
      [5,6,7,8]
    ]
  ), [
    new Float32Array([1,2,3,4]),
    new Float32Array([5,6,7,8]),
  ]);
  gpu.destroy();
});

test('works with cube', () => {
  const gpu = new GPU({ mode: 'dev' });
  const kernel = gpu.createKernel(function(value) {
    return value[this.thread.z][this.thread.y][this.thread.x];
  }, { output: [4, 2, 2] });
  assert.deepEqual(kernel(
    [
      [
        [1,2,3,4],
        [5,6,7,8]
      ],
      [
        [9,10,11,12],
        [13,14,15,16]
      ]
    ]
  ), [
    [
      new Float32Array([1,2,3,4]),
      new Float32Array([5,6,7,8]),
    ],[
      new Float32Array([9,10,11,12]),
      new Float32Array([13,14,15,16]),
    ]
  ]);
  gpu.destroy();
});

test('works with input array', () => {
  const gpu = new GPU({ mode: 'dev' });
  const kernel = gpu.createKernel(function(value) {
    return value[this.thread.x];
  }, { output: [4] });
  assert.deepEqual(kernel(input([1,2,3,4], [4])), new Float32Array([1,2,3,4]));
  gpu.destroy();
});

test('works with input matrix', () => {
  const gpu = new GPU({ mode: 'dev' });
  const kernel = gpu.createKernel(function(value) {
    return value[this.thread.y][this.thread.x];
  }, { output: [4, 2] });
  assert.deepEqual(kernel(input([1,2,3,4,5,6,7,8], [4, 2])), [
    new Float32Array([1,2,3,4]),
    new Float32Array([5,6,7,8]),
  ]);
  gpu.destroy();
});

test('works with input cube', () => {
  const gpu = new GPU({ mode: 'dev' });
  const kernel = gpu.createKernel(function(value) {
    return value[this.thread.z][this.thread.y][this.thread.x];
  }, { output: [4, 2, 2] });
  assert.deepEqual(kernel(
    input([1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16], [4,2,2])
  ), [
    [
      new Float32Array([1,2,3,4]),
      new Float32Array([5,6,7,8]),
    ],[
      new Float32Array([9,10,11,12]),
      new Float32Array([13,14,15,16]),
    ]
  ]);
  gpu.destroy();
});

test('works with texture', () => {
  const texture = ((new GPU()).createKernel(function (cube) {
    return cube[this.thread.z][this.thread.y][this.thread.x];
  }, { output: [4,2,2], pipeline: true }))([
    [
      new Float32Array([1,2,3,4]),
      new Float32Array([5,6,7,8]),
    ],[
      new Float32Array([9,10,11,12]),
      new Float32Array([13,14,15,16]),
    ]
  ]);
  assert.ok(texture.constructor.name.match('Texture'));
  const gpu = new GPU({ mode: 'dev' });
  const kernel = gpu.createKernel(function(value) {
    return value[this.thread.z][this.thread.y][this.thread.x];
  }, { output: [4, 2, 2] });
  assert.deepEqual(kernel(
    texture
  ), [
    [
      new Float32Array([1,2,3,4]),
      new Float32Array([5,6,7,8]),
    ],[
      new Float32Array([9,10,11,12]),
      new Float32Array([13,14,15,16]),
    ]
  ]);
  gpu.destroy();
});

test('works with adding functions', () => {
  const gpu = new GPU({ mode: 'dev' });
  function addOne(value) {
    return value + 1;
  }
  gpu.addFunction(addOne);
  const kernel = gpu.createKernel(function(value) {
    return addOne(value);
  }, { output: [1] });
  assert.deepEqual(kernel(1), new Float32Array([2]));
  gpu.destroy();
});

// issue #719: kernels returning an array produced NaN in dev mode, because
// gpu-mock.js assigned the returned array into a Float32Array slot
test('works with array return', () => {
  const gpu = new GPU({ mode: 'dev' });
  const kernel = gpu.createKernel(function() {
    return [1, 2];
  }, { output: [2] });
  assert.deepEqual(kernel(), [
    new Float32Array([1, 2]),
    new Float32Array([1, 2]),
  ]);
  gpu.destroy();
});

test('works with array return in matrix', () => {
  const gpu = new GPU({ mode: 'dev' });
  const kernel = gpu.createKernel(function() {
    return [this.thread.x, this.thread.y];
  }, { output: [2, 2] });
  assert.deepEqual(kernel(), [
    [new Float32Array([0, 0]), new Float32Array([1, 0])],
    [new Float32Array([0, 1]), new Float32Array([1, 1])],
  ]);
  gpu.destroy();
});

test('works with array return in cube', () => {
  const gpu = new GPU({ mode: 'dev' });
  const kernel = gpu.createKernel(function() {
    return [this.thread.z, 9];
  }, { output: [1, 1, 2] });
  assert.deepEqual(kernel(), [
    [[new Float32Array([0, 9])]],
    [[new Float32Array([1, 9])]],
  ]);
  gpu.destroy();
});

test('array returns match cpu mode', () => {
  function build(mode) {
    const gpu = new GPU({ mode });
    const kernel = gpu.createKernel(function() {
      return [1, 2, 3];
    }, { output: [2, 2] });
    const result = kernel();
    gpu.destroy();
    return result;
  }
  assert.deepEqual(build('dev'), build('cpu'));
});

test('number returns stay a flat Float32Array', () => {
  const gpu = new GPU({ mode: 'dev' });
  const kernel = gpu.createKernel(function() {
    return 7;
  }, { output: [3] });
  const result = kernel();
  assert.ok(result instanceof Float32Array, 'expected a Float32Array, got ' + result.constructor.name);
  assert.deepEqual(result, new Float32Array([7, 7, 7]));
  gpu.destroy();
});
