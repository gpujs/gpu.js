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
