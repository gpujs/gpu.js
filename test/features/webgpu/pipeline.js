const { assert, skip, test, module: describe } = require('qunit');
const { GPU } = require('../../../src');

describe('features: webgpu pipeline');

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

(GPU.isWebGPUSupported ? test : skip)('pipeline handle shape and toArray webgpu', async assert => {
  if (!(await webgpuAdapter(assert))) return;
  assert.expect(6);
  const gpu = new GPU({ mode: 'webgpu' });
  const kernel = gpu.createKernel(function(v) {
    return v[this.thread.x] * 2;
  }, { output: [8], pipeline: true });
  const handle = await kernel([1, 2, 3, 4, 5, 6, 7, 8]);
  assert.equal(handle.type, 'WebGPUBuffer');
  assert.ok(handle.buffer, 'handle exposes the GPUBuffer');
  assert.deepEqual(Array.from(handle.output), [8]);
  assert.equal(typeof handle.toArray, 'function');
  assert.equal(typeof handle.delete, 'function');
  const values = await handle.toArray();
  assert.deepEqual(Array.from(values), [2, 4, 6, 8, 10, 12, 14, 16]);
  handle.delete();
  await gpu.destroy();
});

(GPU.isWebGPUSupported ? test : skip)('handle feeds a second kernel webgpu', async assert => {
  if (!(await webgpuAdapter(assert))) return;
  assert.expect(2);
  const gpu = new GPU({ mode: 'webgpu' });
  const producer = gpu.createKernel(function(v) {
    return v[this.thread.x] * 2;
  }, { output: [4], pipeline: true });
  const consumer = gpu.createKernel(function(v) {
    return v[this.thread.x] + 1;
  }, { output: [4] });
  const handle = await producer([1, 2, 3, 4]);
  const result = await consumer(handle);
  assert.equal(result.constructor, Float32Array);
  assert.deepEqual(Array.from(result), [3, 5, 7, 9]);
  await gpu.destroy();
});

(GPU.isWebGPUSupported ? test : skip)('handle reused by the same kernel webgpu', async assert => {
  if (!(await webgpuAdapter(assert))) return;
  assert.expect(1);
  const gpu = new GPU({ mode: 'webgpu' });
  // immutable: feeding a kernel its own prior output needs a fresh output
  // buffer per call, same discipline as the GL backends' immutable textures
  const kernel = gpu.createKernel(function(v) {
    return v[this.thread.x] + 1;
  }, { output: [4], pipeline: true, immutable: true });
  const first = await kernel([1, 2, 3, 4]);
  const second = await kernel(first);
  const values = await second.toArray();
  assert.deepEqual(Array.from(values), [3, 4, 5, 6]);
  await gpu.destroy();
});

(GPU.isWebGPUSupported ? test : skip)('three-kernel chain ends in plain values webgpu', async assert => {
  if (!(await webgpuAdapter(assert))) return;
  assert.expect(2);
  const gpu = new GPU({ mode: 'webgpu' });
  const k1 = gpu.createKernel(function(v) {
    return v[this.thread.x] * 2;
  }, { output: [4], pipeline: true });
  const k2 = gpu.createKernel(function(v) {
    return v[this.thread.x] + 1;
  }, { output: [4], pipeline: true });
  const k3 = gpu.createKernel(function(v) {
    return v[this.thread.x] * 10;
  }, { output: [4] });
  const h1 = await k1([1, 2, 3, 4]);
  const h2 = await k2(h1);
  const result = await k3(h2);
  assert.equal(result.constructor, Float32Array);
  assert.deepEqual(Array.from(result), [30, 50, 70, 90]);
  await gpu.destroy();
});

(GPU.isWebGPUSupported ? test : skip)('destroy resolves after a chain webgpu', async assert => {
  if (!(await webgpuAdapter(assert))) return;
  assert.expect(3);
  const gpu = new GPU({ mode: 'webgpu' });
  const producer = gpu.createKernel(function(v) {
    return v[this.thread.x] + 1;
  }, { output: [4], pipeline: true });
  const consumer = gpu.createKernel(function(v) {
    return v[this.thread.x] * 3;
  }, { output: [4] });
  const handle = await producer([1, 2, 3, 4]);
  const result = await consumer(handle);
  assert.deepEqual(Array.from(result), [6, 9, 12, 15]);
  const destroyed = gpu.destroy();
  assert.equal(typeof destroyed.then, 'function', 'destroy returns a Promise');
  await destroyed;
  assert.ok(true, 'destroy resolved');
});
