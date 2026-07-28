const { assert, skip, test, module: describe } = require('qunit');
const { GPU } = require('../../../src');

describe('features: webgpu constants');

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

(GPU.isWebGPUSupported ? test : skip)('float constant webgpu', async assert => {
  if (!(await webgpuAdapter(assert))) return;
  assert.expect(1);
  const gpu = new GPU({ mode: 'webgpu' });
  const kernel = gpu.createKernel(function() {
    return this.constants.f + this.thread.x;
  }, { output: [3], constants: { f: 1.5 } });
  const result = await kernel();
  assert.deepEqual(Array.from(result), [1.5, 2.5, 3.5]);
  await gpu.destroy();
});

(GPU.isWebGPUSupported ? test : skip)('integer constant webgpu', async assert => {
  if (!(await webgpuAdapter(assert))) return;
  assert.expect(1);
  const gpu = new GPU({ mode: 'webgpu' });
  const kernel = gpu.createKernel(function() {
    return this.constants.n * this.thread.x;
  }, { output: [3], constants: { n: 3 } });
  const result = await kernel();
  assert.deepEqual(Array.from(result), [0, 3, 6]);
  await gpu.destroy();
});

(GPU.isWebGPUSupported ? test : skip)('boolean constant webgpu', async assert => {
  if (!(await webgpuAdapter(assert))) return;
  assert.expect(2);
  const gpu = new GPU({ mode: 'webgpu' });
  const source = function() {
    if (this.constants.flag) {
      return 1;
    }
    return 0;
  };
  const onKernel = gpu.createKernel(source, { output: [2], constants: { flag: true } });
  const offKernel = gpu.createKernel(source, { output: [2], constants: { flag: false } });
  assert.deepEqual(Array.from(await onKernel()), [1, 1]);
  assert.deepEqual(Array.from(await offKernel()), [0, 0]);
  await gpu.destroy();
});

(GPU.isWebGPUSupported ? test : skip)('array constant webgpu', async assert => {
  if (!(await webgpuAdapter(assert))) return;
  assert.expect(1);
  const gpu = new GPU({ mode: 'webgpu' });
  const kernel = gpu.createKernel(function() {
    return this.constants.arr[this.thread.x];
  }, { output: [4], constants: { arr: [10, 20, 30, 40] } });
  const result = await kernel();
  assert.deepEqual(Array.from(result), [10, 20, 30, 40]);
  await gpu.destroy();
});

(GPU.isWebGPUSupported ? test : skip)('constant as loop bound webgpu', async assert => {
  if (!(await webgpuAdapter(assert))) return;
  assert.expect(1);
  const gpu = new GPU({ mode: 'webgpu' });
  const kernel = gpu.createKernel(function(v) {
    let sum = 0;
    for (let i = 0; i < this.constants.size; i++) {
      sum += v[i];
    }
    return sum;
  }, { output: [2], constants: { size: 4 } });
  const result = await kernel([1, 2, 3, 4]);
  assert.deepEqual(Array.from(result), [10, 10]);
  await gpu.destroy();
});
