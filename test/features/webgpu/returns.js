const { assert, skip, test, module: describe } = require('qunit');
const { GPU } = require('../../../src');

describe('features: webgpu return types');

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

(GPU.isWebGPUSupported ? test : skip)('Array(2) return 1d webgpu', async assert => {
  if (!(await webgpuAdapter(assert))) return;
  assert.expect(3);
  const gpu = new GPU({ mode: 'webgpu' });
  const kernel = gpu.createKernel(function(v) {
    return [v[this.thread.x], v[this.thread.x] + 10];
  }, { output: [4] });
  const result = await kernel([1, 2, 3, 4]);
  assert.equal(result.length, 4);
  assert.equal(result[0].constructor, Float32Array);
  assert.deepEqual(result.map(pair => Array.from(pair)), [
    [1, 11],
    [2, 12],
    [3, 13],
    [4, 14],
  ]);
  await gpu.destroy();
});

(GPU.isWebGPUSupported ? test : skip)('Array(3) return 1d webgpu', async assert => {
  if (!(await webgpuAdapter(assert))) return;
  assert.expect(3);
  const gpu = new GPU({ mode: 'webgpu' });
  const kernel = gpu.createKernel(function(v) {
    return [v[this.thread.x], v[this.thread.x] + 10, v[this.thread.x] + 20];
  }, { output: [3] });
  const result = await kernel([1, 2, 3]);
  assert.equal(result.length, 3);
  assert.equal(result[0].length, 3);
  assert.deepEqual(result.map(triple => Array.from(triple)), [
    [1, 11, 21],
    [2, 12, 22],
    [3, 13, 23],
  ]);
  await gpu.destroy();
});

(GPU.isWebGPUSupported ? test : skip)('Array(4) return 1d webgpu', async assert => {
  if (!(await webgpuAdapter(assert))) return;
  assert.expect(3);
  const gpu = new GPU({ mode: 'webgpu' });
  const kernel = gpu.createKernel(function(v) {
    return [v[this.thread.x], v[this.thread.x] + 10, v[this.thread.x] + 20, v[this.thread.x] + 30];
  }, { output: [3] });
  const result = await kernel([1, 2, 3]);
  assert.equal(result.length, 3);
  assert.equal(result[0].length, 4);
  assert.deepEqual(result.map(quad => Array.from(quad)), [
    [1, 11, 21, 31],
    [2, 12, 22, 32],
    [3, 13, 23, 33],
  ]);
  await gpu.destroy();
});

(GPU.isWebGPUSupported ? test : skip)('Array(2) return 2d webgpu', async assert => {
  if (!(await webgpuAdapter(assert))) return;
  assert.expect(3);
  const gpu = new GPU({ mode: 'webgpu' });
  const kernel = gpu.createKernel(function() {
    return [this.thread.x, this.thread.y];
  }, { output: [3, 2] });
  const result = await kernel();
  assert.equal(result.length, 2);
  assert.equal(result[0].length, 3);
  assert.deepEqual(result.map(row => row.map(pair => Array.from(pair))), [
    [[0, 0], [1, 0], [2, 0]],
    [[0, 1], [1, 1], [2, 1]],
  ]);
  await gpu.destroy();
});

(GPU.isWebGPUSupported ? test : skip)('Array(4) return 2d webgpu', async assert => {
  if (!(await webgpuAdapter(assert))) return;
  assert.expect(3);
  const gpu = new GPU({ mode: 'webgpu' });
  const kernel = gpu.createKernel(function() {
    return [this.thread.x, this.thread.y, this.thread.x + this.thread.y, 1];
  }, { output: [2, 2] });
  const result = await kernel();
  assert.equal(result.length, 2);
  assert.equal(result[0].length, 2);
  assert.deepEqual(result.map(row => row.map(quad => Array.from(quad))), [
    [[0, 0, 0, 1], [1, 0, 1, 1]],
    [[0, 1, 1, 1], [1, 1, 2, 1]],
  ]);
  await gpu.destroy();
});
