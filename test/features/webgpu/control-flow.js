const { assert, skip, test, module: describe } = require('qunit');
const { GPU } = require('../../../src');

describe('features: webgpu control flow');

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

(GPU.isWebGPUSupported ? test : skip)('fixed-bound for loop webgpu', async assert => {
  if (!(await webgpuAdapter(assert))) return;
  assert.expect(1);
  const gpu = new GPU({ mode: 'webgpu' });
  const kernel = gpu.createKernel(function() {
    let sum = 0;
    for (let i = 0; i < 10; i++) {
      sum += i;
    }
    return sum + this.thread.x;
  }, { output: [3] });
  const result = await kernel();
  assert.deepEqual(Array.from(result), [45, 46, 47]);
  await gpu.destroy();
});

(GPU.isWebGPUSupported ? test : skip)('loop bound from argument webgpu', async assert => {
  if (!(await webgpuAdapter(assert))) return;
  assert.expect(2);
  const gpu = new GPU({ mode: 'webgpu' });
  const kernel = gpu.createKernel(function(v, n) {
    let sum = 0;
    for (let i = 0; i < n; i++) {
      sum += v[i];
    }
    return sum;
  }, { output: [2] });
  const values = [1, 2, 3, 4, 5, 6];
  const partial = await kernel(values, 3);
  assert.deepEqual(Array.from(partial), [6, 6]);
  const full = await kernel(values, 6);
  assert.deepEqual(Array.from(full), [21, 21]);
  await gpu.destroy();
});

(GPU.isWebGPUSupported ? test : skip)('loop bound from constants webgpu', async assert => {
  if (!(await webgpuAdapter(assert))) return;
  assert.expect(1);
  const gpu = new GPU({ mode: 'webgpu' });
  const kernel = gpu.createKernel(function(v) {
    let sum = 0;
    for (let i = 0; i < this.constants.limit; i++) {
      sum += v[i] * 2;
    }
    return sum;
  }, { output: [2], constants: { limit: 3 } });
  const result = await kernel([1, 2, 3, 4]);
  assert.deepEqual(Array.from(result), [12, 12]);
  await gpu.destroy();
});

(GPU.isWebGPUSupported ? test : skip)('nested loops webgpu', async assert => {
  if (!(await webgpuAdapter(assert))) return;
  assert.expect(1);
  const gpu = new GPU({ mode: 'webgpu' });
  const kernel = gpu.createKernel(function() {
    let sum = 0;
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 4; j++) {
        sum += i * j;
      }
    }
    return sum;
  }, { output: [2] });
  const result = await kernel();
  assert.deepEqual(Array.from(result), [18, 18]);
  await gpu.destroy();
});

(GPU.isWebGPUSupported ? test : skip)('if else on thread.x webgpu', async assert => {
  if (!(await webgpuAdapter(assert))) return;
  assert.expect(1);
  const gpu = new GPU({ mode: 'webgpu' });
  const kernel = gpu.createKernel(function() {
    let value = 0;
    if (this.thread.x < 2) {
      value = 1;
    } else {
      value = 2;
    }
    return value;
  }, { output: [4] });
  const result = await kernel();
  assert.deepEqual(Array.from(result), [1, 1, 2, 2]);
  await gpu.destroy();
});

(GPU.isWebGPUSupported ? test : skip)('if else-if else webgpu', async assert => {
  if (!(await webgpuAdapter(assert))) return;
  assert.expect(1);
  const gpu = new GPU({ mode: 'webgpu' });
  const kernel = gpu.createKernel(function() {
    if (this.thread.x < 2) {
      return 10;
    } else if (this.thread.x < 4) {
      return 20;
    } else {
      return 30;
    }
  }, { output: [6] });
  const result = await kernel();
  assert.deepEqual(Array.from(result), [10, 10, 20, 20, 30, 30]);
  await gpu.destroy();
});

(GPU.isWebGPUSupported ? test : skip)('early return inside a branch webgpu', async assert => {
  if (!(await webgpuAdapter(assert))) return;
  assert.expect(1);
  const gpu = new GPU({ mode: 'webgpu' });
  const kernel = gpu.createKernel(function() {
    if (this.thread.x === 0) {
      return -1;
    }
    return this.thread.x;
  }, { output: [4] });
  const result = await kernel();
  assert.deepEqual(Array.from(result), [-1, 1, 2, 3]);
  await gpu.destroy();
});
