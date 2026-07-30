const { assert, skip, test, module: describe } = require('qunit');
const { GPU } = require('../../../src');

describe('features: webgpu dynamic output');

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

(GPU.isWebGPUSupported ? test : skip)('dynamic output 1d grows webgpu', async assert => {
  if (!(await webgpuAdapter(assert))) return;
  assert.expect(6);
  const gpu = new GPU({ mode: 'webgpu' });
  const kernel = gpu.createKernel(function() {
    return this.output.x + this.thread.x;
  }, { dynamicOutput: true });

  kernel.setOutput([5]);
  let result = await kernel();
  assert.equal(result.length, 5);
  assert.deepEqual(Array.from(result), [5, 6, 7, 8, 9]);
  assert.deepEqual(Array.from(kernel.output), [5]);

  kernel.setOutput([10]);
  result = await kernel();
  assert.equal(result.length, 10);
  assert.deepEqual(Array.from(result), [10, 11, 12, 13, 14, 15, 16, 17, 18, 19]);
  assert.deepEqual(Array.from(kernel.output), [10]);

  await gpu.destroy();
});

(GPU.isWebGPUSupported ? test : skip)('dynamic output 1d shrinks webgpu', async assert => {
  if (!(await webgpuAdapter(assert))) return;
  assert.expect(4);
  const gpu = new GPU({ mode: 'webgpu' });
  const kernel = gpu.createKernel(function() {
    return this.output.x + this.thread.x;
  }, { dynamicOutput: true });

  kernel.setOutput([10]);
  let result = await kernel();
  assert.equal(result.length, 10);
  assert.deepEqual(Array.from(result), [10, 11, 12, 13, 14, 15, 16, 17, 18, 19]);

  kernel.setOutput([5]);
  result = await kernel();
  assert.equal(result.length, 5);
  assert.deepEqual(Array.from(result), [5, 6, 7, 8, 9]);

  await gpu.destroy();
});

(GPU.isWebGPUSupported ? test : skip)('dynamic output 2d resize webgpu', async assert => {
  if (!(await webgpuAdapter(assert))) return;
  assert.expect(4);
  const gpu = new GPU({ mode: 'webgpu' });
  const kernel = gpu.createKernel(function() {
    return this.thread.y * 10 + this.thread.x;
  }, { dynamicOutput: true });

  kernel.setOutput([3, 2]);
  let result = await kernel();
  assert.equal(result.length, 2);
  assert.deepEqual(result.map(row => Array.from(row)), [
    [0, 1, 2],
    [10, 11, 12],
  ]);

  kernel.setOutput([2, 4]);
  result = await kernel();
  assert.equal(result.length, 4);
  assert.deepEqual(result.map(row => Array.from(row)), [
    [0, 1],
    [10, 11],
    [20, 21],
    [30, 31],
  ]);

  await gpu.destroy();
});

(GPU.isWebGPUSupported ? test : skip)('dynamic arguments across calls webgpu', async assert => {
  if (!(await webgpuAdapter(assert))) return;
  assert.expect(2);
  const gpu = new GPU({ mode: 'webgpu' });
  const kernel = gpu.createKernel(function(v) {
    return v[this.thread.x] * 2;
  }, { dynamicOutput: true, dynamicArguments: true });

  kernel.setOutput([3]);
  const small = await kernel([1, 2, 3]);
  assert.deepEqual(Array.from(small), [2, 4, 6]);

  kernel.setOutput([6]);
  const large = await kernel([1, 2, 3, 4, 5, 6]);
  assert.deepEqual(Array.from(large), [2, 4, 6, 8, 10, 12]);

  await gpu.destroy();
});
