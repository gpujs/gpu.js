const { assert, skip, test, module: describe } = require('qunit');
const { GPU, input } = require('../../../src');

describe('features: webgpu arguments');

// navigator.gpu can be present with no adapter (headless Chromium, blocklisted
// GPUs); QUnit cannot skip at runtime, so an adapterless environment records a
// pass with an explicit message and bumps a counter the headed canary rejects.
let adapterPromise = null;
async function webgpuAdapter(assert) {
  if (!adapterPromise) adapterPromise = navigator.gpu.requestAdapter();
  const adapter = await adapterPromise;
  if (!adapter) {
    if (typeof window !== 'undefined') {
      window.__webgpuRuntimeSkips = (window.__webgpuRuntimeSkips || 0) + 1;
    }
    assert.ok(true, 'navigator.gpu present but no adapter (headless/blocklisted) — runtime skip');
  }
  return adapter;
}

// One kernel per input flavor: v1 throws on argument-type changes after build,
// so the same kernel must not be fed Array then Float32Array.
(GPU.isWebGPUSupported ? test : skip)('plain array and Float32Array agree webgpu', async assert => {
  if (!(await webgpuAdapter(assert))) return;
  assert.expect(2);
  const gpu = new GPU({ mode: 'webgpu' });
  const source = function(v) {
    return v[this.thread.x] * 2;
  };
  const plainKernel = gpu.createKernel(source, { output: [8] });
  const typedKernel = gpu.createKernel(source, { output: [8] });
  const values = [1, 2, 3, 4, 5, 6, 7, 8];
  const fromPlain = await plainKernel(values);
  const fromTyped = await typedKernel(new Float32Array(values));
  assert.deepEqual(Array.from(fromPlain), [2, 4, 6, 8, 10, 12, 14, 16]);
  assert.deepEqual(Array.from(fromTyped), Array.from(fromPlain));
  await gpu.destroy();
});

(GPU.isWebGPUSupported ? test : skip)('array of Float32Array rows webgpu', async assert => {
  if (!(await webgpuAdapter(assert))) return;
  assert.expect(1);
  const gpu = new GPU({ mode: 'webgpu' });
  const kernel = gpu.createKernel(function(m) {
    return m[this.thread.y][this.thread.x] + 1;
  }, { output: [3, 2] });
  const result = await kernel([
    new Float32Array([1, 2, 3]),
    new Float32Array([4, 5, 6]),
  ]);
  assert.deepEqual(result.map(row => Array.from(row)), [
    [2, 3, 4],
    [5, 6, 7],
  ]);
  await gpu.destroy();
});

(GPU.isWebGPUSupported ? test : skip)('nested plain arrays 2d webgpu', async assert => {
  if (!(await webgpuAdapter(assert))) return;
  assert.expect(1);
  const gpu = new GPU({ mode: 'webgpu' });
  const kernel = gpu.createKernel(function(m) {
    return m[this.thread.y][this.thread.x] * 10;
  }, { output: [3, 2] });
  const result = await kernel([
    [1, 2, 3],
    [4, 5, 6],
  ]);
  assert.deepEqual(result.map(row => Array.from(row)), [
    [10, 20, 30],
    [40, 50, 60],
  ]);
  await gpu.destroy();
});

(GPU.isWebGPUSupported ? test : skip)('nested plain arrays 3d webgpu', async assert => {
  if (!(await webgpuAdapter(assert))) return;
  assert.expect(1);
  const gpu = new GPU({ mode: 'webgpu' });
  const kernel = gpu.createKernel(function(m) {
    return m[this.thread.z][this.thread.y][this.thread.x] + 1;
  }, { output: [2, 2, 2] });
  const result = await kernel([
    [[1, 2], [3, 4]],
    [[5, 6], [7, 8]],
  ]);
  assert.deepEqual(result.map(z => z.map(row => Array.from(row))), [
    [[2, 3], [4, 5]],
    [[6, 7], [8, 9]],
  ]);
  await gpu.destroy();
});

(GPU.isWebGPUSupported ? test : skip)('input-wrapped flat data webgpu', async assert => {
  if (!(await webgpuAdapter(assert))) return;
  assert.expect(1);
  const gpu = new GPU({ mode: 'webgpu' });
  const kernel = gpu.createKernel(function(m) {
    return m[this.thread.y][this.thread.x];
  }, { output: [3, 3] });
  const flat = new Float32Array([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  const result = await kernel(input(flat, [3, 3]));
  assert.deepEqual(result.map(row => Array.from(row)), [
    [1, 2, 3],
    [4, 5, 6],
    [7, 8, 9],
  ]);
  await gpu.destroy();
});

(GPU.isWebGPUSupported ? test : skip)('negative and fractional number arguments webgpu', async assert => {
  if (!(await webgpuAdapter(assert))) return;
  assert.expect(1);
  const gpu = new GPU({ mode: 'webgpu' });
  const kernel = gpu.createKernel(function(v, scale, offset) {
    return v[this.thread.x] * scale + offset;
  }, { output: [4] });
  const result = await kernel([1, 2, 3, 4], -2.5, 0.5);
  assert.deepEqual(Array.from(result), [-2, -4.5, -7, -9.5]);
  await gpu.destroy();
});

(GPU.isWebGPUSupported ? test : skip)('boolean argument in a condition webgpu', async assert => {
  if (!(await webgpuAdapter(assert))) return;
  assert.expect(2);
  const gpu = new GPU({ mode: 'webgpu' });
  const kernel = gpu.createKernel(function(v, negate) {
    if (negate) {
      return -v[this.thread.x];
    }
    return v[this.thread.x];
  }, { output: [4] });
  const values = [1, 2, 3, 4];
  const kept = await kernel(values, false);
  assert.deepEqual(Array.from(kept), [1, 2, 3, 4]);
  const negated = await kernel(values, true);
  assert.deepEqual(Array.from(negated), [-1, -2, -3, -4]);
  await gpu.destroy();
});
