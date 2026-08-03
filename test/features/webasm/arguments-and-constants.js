const { assert, test, module: describe } = require('qunit');
const { GPU, input } = require('../../../src');

describe('features: webasm arguments and constants');

test('1d array argument webasm', assert => {
  assert.expect(1);
  const gpu = new GPU({ mode: 'webasm' });
  const kernel = gpu.createKernel(function(a) {
    return a[this.thread.x] * 2;
  }, { output: [4] });
  assert.deepEqual(Array.from(kernel([1, 2, 3, 4])), [2, 4, 6, 8]);
  gpu.destroy();
});

test('2d array argument webasm', assert => {
  assert.expect(1);
  const gpu = new GPU({ mode: 'webasm' });
  const kernel = gpu.createKernel(function(a) {
    return a[this.thread.y][this.thread.x] + 10;
  }, { output: [3, 2] });
  const result = kernel([[1, 2, 3], [4, 5, 6]]);
  assert.deepEqual(result.map(row => Array.from(row)), [[11, 12, 13], [14, 15, 16]]);
  gpu.destroy();
});

test('3d array argument webasm', assert => {
  assert.expect(1);
  const gpu = new GPU({ mode: 'webasm' });
  const kernel = gpu.createKernel(function(a) {
    return a[this.thread.z][this.thread.y][this.thread.x] * 10;
  }, { output: [2, 2, 2] });
  const result = kernel([
    [[1, 2], [3, 4]],
    [[5, 6], [7, 8]],
  ]);
  assert.deepEqual(result.map(layer => layer.map(row => Array.from(row))), [
    [[10, 20], [30, 40]],
    [[50, 60], [70, 80]],
  ]);
  gpu.destroy();
});

test('Input argument webasm', assert => {
  assert.expect(1);
  const gpu = new GPU({ mode: 'webasm' });
  const kernel = gpu.createKernel(function(a) {
    return a[this.thread.y][this.thread.x];
  }, { output: [4, 2] });
  const flat = new Float32Array([1, 2, 3, 4, 5, 6, 7, 8]);
  const result = kernel(input(flat, [4, 2]));
  assert.deepEqual(result.map(row => Array.from(row)), [[1, 2, 3, 4], [5, 6, 7, 8]]);
  gpu.destroy();
});

test('scalar number and boolean arguments webasm', assert => {
  assert.expect(2);
  const gpu = new GPU({ mode: 'webasm' });
  const kernel = gpu.createKernel(function(scale, offset) {
    return this.thread.x * scale + offset;
  }, { output: [4] });
  assert.deepEqual(Array.from(kernel(2, 0.5)), [0.5, 2.5, 4.5, 6.5]);
  const gate = gpu.createKernel(function(flag) {
    if (flag) {
      return 1;
    }
    return 0;
  }, { output: [2] });
  assert.deepEqual([Array.from(gate(true)), Array.from(gate(false))], [[1, 1], [0, 0]]);
  gpu.destroy();
});

test('integer argument does real i32 bitwise webasm', assert => {
  assert.expect(1);
  const gpu = new GPU({ mode: 'webasm' });
  const kernel = gpu.createKernel(function(n) {
    return ((n & 12) | (n << 2)) ^ (n >> 1);
  }, { output: [1], argumentTypes: { n: 'Integer' } });
  const n = 27;
  assert.equal(kernel(n)[0], ((n & 12) | (n << 2)) ^ (n >> 1));
  gpu.destroy();
});

test('constants: array, float, integer, boolean webasm', assert => {
  assert.expect(1);
  const gpu = new GPU({ mode: 'webasm' });
  const kernel = gpu.createKernel(function() {
    let value = this.constants.arr[this.thread.x] * this.constants.scale;
    if (this.constants.enabled) {
      value += this.constants.bump;
    }
    return value;
  }, {
    output: [4],
    constants: { arr: [1, 2, 3, 4], scale: 0.5, bump: 10, enabled: true },
  });
  assert.deepEqual(Array.from(kernel()), [10.5, 11, 11.5, 12]);
  gpu.destroy();
});

test('constants array via Input webasm', assert => {
  assert.expect(1);
  const gpu = new GPU({ mode: 'webasm' });
  const kernel = gpu.createKernel(function() {
    return this.constants.grid[this.thread.y][this.thread.x];
  }, {
    output: [2, 2],
    constants: { grid: input(new Float32Array([1, 2, 3, 4]), [2, 2]) },
  });
  assert.deepEqual(kernel().map(row => Array.from(row)), [[1, 2], [3, 4]]);
  gpu.destroy();
});

test('dynamicArguments accepts changing sizes webasm', assert => {
  assert.expect(2);
  const gpu = new GPU({ mode: 'webasm' });
  const kernel = gpu.createKernel(function(a) {
    return a[this.thread.x] + 1;
  }, { output: [4], dynamicArguments: true });
  assert.deepEqual(Array.from(kernel([1, 2, 3, 4])), [2, 3, 4, 5]);
  // a longer input reads its own layout, not the first call's
  assert.deepEqual(Array.from(kernel([9, 8, 7, 6, 5, 4, 3, 2])), [10, 9, 8, 7]);
  gpu.destroy();
});

test('argument size change without dynamicArguments throws webasm', assert => {
  assert.expect(2);
  const gpu = new GPU({ mode: 'webasm' });
  const kernel = gpu.createKernel(function(a) {
    return a[this.thread.x];
  }, { output: [4] });
  assert.deepEqual(Array.from(kernel([1, 2, 3, 4])), [1, 2, 3, 4]);
  assert.throws(() => kernel([1, 2, 3, 4, 5, 6]), /changed size/);
  gpu.destroy();
});

test('one kernel\'s arguments do not clobber another\'s webasm', assert => {
  assert.expect(2);
  const gpu = new GPU({ mode: 'webasm' });
  const first = gpu.createKernel(function(a) {
    return a[this.thread.x] * 2;
  }, { output: [4] });
  const second = gpu.createKernel(function(a) {
    return a[this.thread.x] * 3;
  }, { output: [4] });
  const firstResult = first([1, 2, 3, 4]);
  second([10, 20, 30, 40]);
  assert.deepEqual(Array.from(first([1, 2, 3, 4])), [2, 4, 6, 8]);
  assert.deepEqual(Array.from(firstResult), [2, 4, 6, 8]);
  gpu.destroy();
});

test('argument updated in expression position vectorizes webasm', assert => {
  // `let y = a++` reaches the variance analysis through the expression walk,
  // which must record the argument's shadow membership exactly like the
  // statement walk does -- it used to reject the kernel outright on any
  // SIMD-capable host
  const gpu = new GPU({ mode: 'webasm' });
  const kernel = gpu.createKernel(function (a) {
    let y = a++;
    return y + a;
  }, { output: [4] });
  assert.deepEqual(Array.from(kernel(5)), [11, 11, 11, 11]);
  gpu.destroy();
});
