const { assert, skip, test, module: describe } = require('qunit');
const { GPU } = require('../../../src');

describe('features: webgpu basics');

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

(GPU.isWebGPUSupported ? test : skip)('returns a constant 1d webgpu', async assert => {
  if (!(await webgpuAdapter(assert))) return;
  assert.expect(3);
  const gpu = new GPU({ mode: 'webgpu' });
  const kernel = gpu.createKernel(function() {
    return 42;
  }, { output: [8] });
  const result = await kernel();
  assert.equal(result.constructor, Float32Array);
  assert.equal(result.length, 8);
  assert.deepEqual(Array.from(result), [42, 42, 42, 42, 42, 42, 42, 42]);
  await gpu.destroy();
});

(GPU.isWebGPUSupported ? test : skip)('scalar map 1d webgpu', async assert => {
  if (!(await webgpuAdapter(assert))) return;
  assert.expect(2);
  const gpu = new GPU({ mode: 'webgpu' });
  const kernel = gpu.createKernel(function() {
    return this.thread.x;
  }, { output: [8] });
  const first = await kernel();
  assert.deepEqual(Array.from(first), [0, 1, 2, 3, 4, 5, 6, 7]);
  // second call must reuse the built pipeline, not rebuild
  const second = await kernel();
  assert.deepEqual(Array.from(second), [0, 1, 2, 3, 4, 5, 6, 7]);
  await gpu.destroy();
});

(GPU.isWebGPUSupported ? test : skip)('scalar map 2d webgpu', async assert => {
  if (!(await webgpuAdapter(assert))) return;
  assert.expect(3);
  const gpu = new GPU({ mode: 'webgpu' });
  const kernel = gpu.createKernel(function() {
    return this.thread.y * 100 + this.thread.x;
  }, { output: [4, 3] });
  const result = await kernel();
  assert.equal(result.length, 3);
  assert.equal(result[0].constructor, Float32Array);
  assert.deepEqual(result.map(row => Array.from(row)), [
    [0, 1, 2, 3],
    [100, 101, 102, 103],
    [200, 201, 202, 203],
  ]);
  await gpu.destroy();
});

(GPU.isWebGPUSupported ? test : skip)('scalar map 3d webgpu', async assert => {
  if (!(await webgpuAdapter(assert))) return;
  assert.expect(4);
  const gpu = new GPU({ mode: 'webgpu' });
  const kernel = gpu.createKernel(function() {
    return this.thread.z * 100 + this.thread.y * 10 + this.thread.x;
  }, { output: [3, 2, 2] });
  const result = await kernel();
  assert.equal(result.length, 2);
  assert.equal(result[0].length, 2);
  assert.equal(result[0][0].constructor, Float32Array);
  assert.deepEqual(result.map(z => z.map(row => Array.from(row))), [
    [[0, 1, 2], [10, 11, 12]],
    [[100, 101, 102], [110, 111, 112]],
  ]);
  await gpu.destroy();
});

(GPU.isWebGPUSupported ? test : skip)('two array arguments webgpu', async assert => {
  if (!(await webgpuAdapter(assert))) return;
  assert.expect(1);
  const gpu = new GPU({ mode: 'webgpu' });
  const kernel = gpu.createKernel(function(a, b) {
    return a[this.thread.x] + b[this.thread.x];
  }, { output: [6] });
  const result = await kernel([1, 2, 3, 5, 6, 7], [4, 5, 6, 1, 2, 3]);
  assert.deepEqual(Array.from(result), [5, 7, 9, 6, 8, 10]);
  await gpu.destroy();
});

(GPU.isWebGPUSupported ? test : skip)('five mixed arguments webgpu', async assert => {
  if (!(await webgpuAdapter(assert))) return;
  assert.expect(2);
  const gpu = new GPU({ mode: 'webgpu' });
  const kernel = gpu.createKernel(function(a, b, scale, offset, flip) {
    if (flip) {
      return (b[this.thread.x] - a[this.thread.x]) * scale + offset;
    }
    return (a[this.thread.x] + b[this.thread.x]) * scale + offset;
  }, { output: [4] });
  const a = [1, 2, 3, 4];
  const b = [5, 6, 7, 8];
  const summed = await kernel(a, b, 2, 0.5, false);
  assert.deepEqual(Array.from(summed), [12.5, 16.5, 20.5, 24.5]);
  const flipped = await kernel(a, b, 2, 0.5, true);
  assert.deepEqual(Array.from(flipped), [8.5, 8.5, 8.5, 8.5]);
  await gpu.destroy();
});

(GPU.isWebGPUSupported ? test : skip)('kernel call returns a thenable, cpu stays sync webgpu', async assert => {
  if (!(await webgpuAdapter(assert))) return;
  assert.expect(4);
  const gpu = new GPU({ mode: 'webgpu' });
  const kernel = gpu.createKernel(function() {
    return 7;
  }, { output: [2] });
  const pending = kernel();
  assert.equal(typeof pending.then, 'function', 'webgpu mode returns a Promise');
  const result = await pending;
  assert.deepEqual(Array.from(result), [7, 7]);
  const cpu = new GPU({ mode: 'cpu' });
  const cpuKernel = cpu.createKernel(function() {
    return 7;
  }, { output: [2] });
  const cpuResult = cpuKernel();
  assert.equal(typeof cpuResult.then, 'undefined', 'cpu mode returns the value synchronously');
  assert.deepEqual(Array.from(cpuResult), [7, 7]);
  await cpu.destroy();
  await gpu.destroy();
});

// No adapter guard: kernelOrder must be unchanged even where webgpu cannot run.
(GPU.isWebGPUSupported ? test : skip)('auto mode does not select webgpu webgpu', async assert => {
  assert.expect(1);
  const gpu = new GPU();
  assert.notEqual(gpu.mode, 'webgpu', 'webgpu is opt-in only; auto selection is unchanged');
  await gpu.destroy();
});

// No adapter guard: isWebGPUAvailable must resolve false where there is no adapter.
(GPU.isWebGPUSupported ? test : skip)('isWebGPUAvailable resolves a boolean webgpu', async assert => {
  assert.expect(1);
  const available = await GPU.isWebGPUAvailable();
  assert.equal(typeof available, 'boolean');
});
