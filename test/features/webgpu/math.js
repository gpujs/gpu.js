const { assert, skip, test, module: describe } = require('qunit');
const { GPU } = require('../../../src');

describe('features: webgpu math');

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

// fp32 results cannot be compared exactly against fp64 JS references
function closeTo(assert, actual, expected, epsilon, message) {
  assert.ok(Math.abs(actual - expected) < epsilon, `${message}: expected ${expected}, got ${actual}`);
}

(GPU.isWebGPUSupported ? test : skip)('abs floor ceil sqrt combined webgpu', async assert => {
  if (!(await webgpuAdapter(assert))) return;
  assert.expect(4);
  const gpu = new GPU({ mode: 'webgpu' });
  const kernel = gpu.createKernel(function(v) {
    let x = v[this.thread.x];
    return Math.sqrt(Math.abs(x)) + Math.floor(x) + Math.ceil(x / 2);
  }, { output: [4] });
  const values = [-2.25, 0.5, 3.75, 9];
  const result = await kernel(values);
  for (let i = 0; i < values.length; i++) {
    const x = values[i];
    const expected = Math.sqrt(Math.abs(x)) + Math.floor(x) + Math.ceil(x / 2);
    closeTo(assert, result[i], expected, 1e-4, `index ${i}`);
  }
  await gpu.destroy();
});

(GPU.isWebGPUSupported ? test : skip)('sin cos exp combined webgpu', async assert => {
  if (!(await webgpuAdapter(assert))) return;
  assert.expect(4);
  const gpu = new GPU({ mode: 'webgpu' });
  const kernel = gpu.createKernel(function(v) {
    let x = v[this.thread.x];
    return Math.sin(x) + Math.cos(x) + Math.exp(x / 4);
  }, { output: [4] });
  const values = [0, 0.5, 1.25, 3];
  const result = await kernel(values);
  for (let i = 0; i < values.length; i++) {
    const x = values[i];
    const expected = Math.sin(x) + Math.cos(x) + Math.exp(x / 4);
    closeTo(assert, result[i], expected, 1e-4, `index ${i}`);
  }
  await gpu.destroy();
});

(GPU.isWebGPUSupported ? test : skip)('min max pow atan2 combined webgpu', async assert => {
  if (!(await webgpuAdapter(assert))) return;
  assert.expect(4);
  const gpu = new GPU({ mode: 'webgpu' });
  const kernel = gpu.createKernel(function(a, b) {
    let x = a[this.thread.x];
    let y = b[this.thread.x];
    return Math.pow(Math.max(x, y), 2) + Math.min(x, y) + Math.atan2(x, y);
  }, { output: [4] });
  const a = [1, 3, 2, 0.5];
  const b = [2, 1, 4, 0.25];
  const result = await kernel(a, b);
  for (let i = 0; i < a.length; i++) {
    const expected = Math.pow(Math.max(a[i], b[i]), 2) + Math.min(a[i], b[i]) + Math.atan2(a[i], b[i]);
    closeTo(assert, result[i], expected, 1e-3, `index ${i}`);
  }
  await gpu.destroy();
});

(GPU.isWebGPUSupported ? test : skip)('Math.PI webgpu', async assert => {
  if (!(await webgpuAdapter(assert))) return;
  assert.expect(1);
  const gpu = new GPU({ mode: 'webgpu' });
  const kernel = gpu.createKernel(function() {
    return Math.PI;
  }, { output: [1] });
  const result = await kernel();
  closeTo(assert, result[0], Math.PI, 1e-6, 'Math.PI');
  await gpu.destroy();
});

// division of number literals and of this.thread.x must be fractional, as in
// JS — pins the WGSL i32/f32 typing decisions against GLSL-backend behavior
(GPU.isWebGPUSupported ? test : skip)('literal and thread division are fractional webgpu', async assert => {
  if (!(await webgpuAdapter(assert))) return;
  assert.expect(5);
  const gpu = new GPU({ mode: 'webgpu' });
  const literalKernel = gpu.createKernel(function() {
    return 7 / 2;
  }, { output: [1] });
  const literalResult = await literalKernel();
  closeTo(assert, literalResult[0], 3.5, 1e-3, 'literal 7 / 2');
  const threadKernel = gpu.createKernel(function() {
    return this.thread.x / 64;
  }, { output: [4] });
  const threadResult = await threadKernel();
  for (let i = 0; i < 4; i++) {
    closeTo(assert, threadResult[i], i / 64, 1e-3, `thread.x ${i} / 64`);
  }
  await gpu.destroy();
});

(GPU.isWebGPUSupported ? test : skip)('Math.floor on division webgpu', async assert => {
  if (!(await webgpuAdapter(assert))) return;
  assert.expect(1);
  const gpu = new GPU({ mode: 'webgpu' });
  const kernel = gpu.createKernel(function(a, b) {
    return Math.floor(a[this.thread.x] / b[this.thread.x]);
  }, { output: [4] });
  const result = await kernel([7, 9, 10, 100], [2, 4, 3, 7]);
  assert.deepEqual(Array.from(result), [3, 2, 3, 14]);
  await gpu.destroy();
});

(GPU.isWebGPUSupported ? test : skip)('Math.floor on negatives webgpu', async assert => {
  if (!(await webgpuAdapter(assert))) return;
  assert.expect(1);
  const gpu = new GPU({ mode: 'webgpu' });
  const kernel = gpu.createKernel(function(v) {
    return Math.floor(v[this.thread.x]);
  }, { output: [4] });
  const result = await kernel([-2.5, -0.5, 2.5, -3]);
  assert.deepEqual(Array.from(result), [-3, -1, 2, -3]);
  await gpu.destroy();
});

(GPU.isWebGPUSupported ? test : skip)('modulo webgpu', async assert => {
  if (!(await webgpuAdapter(assert))) return;
  assert.expect(4);
  const gpu = new GPU({ mode: 'webgpu' });
  const kernel = gpu.createKernel(function(a, b) {
    return a[this.thread.x] % b[this.thread.x];
  }, { output: [4] });
  const result = await kernel([5, 7.5, 9, 10], [3, 2, 4, 4]);
  const expected = [2, 1.5, 1, 2];
  for (let i = 0; i < expected.length; i++) {
    closeTo(assert, result[i], expected[i], 1e-4, `index ${i}`);
  }
  await gpu.destroy();
});

(GPU.isWebGPUSupported ? test : skip)('integer loop counter arithmetic webgpu', async assert => {
  if (!(await webgpuAdapter(assert))) return;
  assert.expect(1);
  const gpu = new GPU({ mode: 'webgpu' });
  const kernel = gpu.createKernel(function() {
    let sum = 0;
    for (let i = 0; i < 5; i++) {
      sum += i * 2;
    }
    return sum + this.thread.x;
  }, { output: [2] });
  const result = await kernel();
  assert.deepEqual(Array.from(result), [20, 21]);
  await gpu.destroy();
});
