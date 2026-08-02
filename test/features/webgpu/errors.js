const { assert, skip, test, module: describe } = require('qunit');
const { GPU } = require('../../../src');

describe('features: webgpu errors');

// Deferred features must throw messages starting with this prefix
// (INTEGRATION-CONTRACT.md)
const DEFERRED = /^WebGPU backend does not yet support/;

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

(GPU.isWebGPUSupported ? test : skip)('createKernelMap throws deferred webgpu', async assert => {
  if (!(await webgpuAdapter(assert))) return;
  assert.expect(1);
  const gpu = new GPU({ mode: 'webgpu' });
  let error = null;
  try {
    const kernel = gpu.createKernelMap({
      doubled: function double(x) {
        return x * 2;
      },
    }, function(v) {
      return double(v[this.thread.x]);
    }, { output: [4] });
    await kernel([1, 2, 3, 4]);
  } catch (e) {
    error = e;
  }
  assert.ok(error && DEFERRED.test(error.message), `deferred prefix, got: ${error && error.message}`);
  await gpu.destroy();
});

(GPU.isWebGPUSupported ? test : skip)('graphical with a non-2D output throws webgpu', async assert => {
  if (!(await webgpuAdapter(assert))) return;
  assert.expect(1);
  const gpu = new GPU({ mode: 'webgpu' });
  let error = null;
  try {
    const kernel = gpu.createKernel(function() {
      this.color(1, 0, 0, 1);
    }, { output: [16], graphical: true });
    await kernel();
  } catch (e) {
    error = e;
  }
  assert.ok(error && /2 dimensions/.test(error.message), `explains the constraint, got: ${error && error.message}`);
  await gpu.destroy();
});

(GPU.isWebGPUSupported ? test : skip)('graphical with pipeline throws webgpu', async assert => {
  if (!(await webgpuAdapter(assert))) return;
  assert.expect(1);
  const gpu = new GPU({ mode: 'webgpu' });
  let error = null;
  try {
    const kernel = gpu.createKernel(function() {
      this.color(1, 0, 0, 1);
    }, { output: [4, 4], graphical: true, pipeline: true });
    await kernel();
  } catch (e) {
    error = e;
  }
  assert.ok(error && /mutually exclusive/.test(error.message), `explains, got: ${error && error.message}`);
  await gpu.destroy();
});

(GPU.isWebGPUSupported ? test : skip)('precision unsigned throws deferred webgpu', async assert => {
  if (!(await webgpuAdapter(assert))) return;
  assert.expect(1);
  const gpu = new GPU({ mode: 'webgpu' });
  let error = null;
  try {
    const kernel = gpu.createKernel(function() {
      return 1;
    }, { output: [4], precision: 'unsigned' });
    await kernel();
  } catch (e) {
    error = e;
  }
  assert.ok(error && DEFERRED.test(error.message), `deferred prefix, got: ${error && error.message}`);
  await gpu.destroy();
});

(GPU.isWebGPUSupported ? test : skip)('precision single is accepted webgpu', async assert => {
  if (!(await webgpuAdapter(assert))) return;
  assert.expect(1);
  const gpu = new GPU({ mode: 'webgpu' });
  const kernel = gpu.createKernel(function() {
    return 1.5;
  }, { output: [2], precision: 'single' });
  const result = await kernel();
  assert.deepEqual(Array.from(result), [1.5, 1.5]);
  await gpu.destroy();
});

(GPU.isWebGPUSupported ? test : skip)('toString throws deferred webgpu', async assert => {
  if (!(await webgpuAdapter(assert))) return;
  assert.expect(2);
  const gpu = new GPU({ mode: 'webgpu' });
  const kernel = gpu.createKernel(function() {
    return 1;
  }, { output: [2] });
  const result = await kernel();
  assert.equal(result.length, 2);
  let error = null;
  try {
    kernel.toString();
  } catch (e) {
    error = e;
  }
  assert.ok(error && DEFERRED.test(error.message), `deferred prefix, got: ${error && error.message}`);
  await gpu.destroy();
});



// message not pinned by the contract; only the throw is
(GPU.isWebGPUSupported ? test : skip)('combineKernels throws webgpu', async assert => {
  if (!(await webgpuAdapter(assert))) return;
  assert.expect(1);
  const gpu = new GPU({ mode: 'webgpu' });
  let error = null;
  try {
    const k1 = gpu.createKernel(function(v) {
      return v[this.thread.x] + 1;
    }, { output: [4], pipeline: true });
    const k2 = gpu.createKernel(function(v) {
      return v[this.thread.x] * 2;
    }, { output: [4] });
    const combined = gpu.combineKernels(k1, k2, function(v) {
      return k2(k1(v));
    });
    await combined([1, 2, 3, 4]);
  } catch (e) {
    error = e;
  }
  assert.ok(error instanceof Error, `combineKernels is deferred, got: ${error && error.message}`);
  await gpu.destroy();
});

// build failures must reject the kernel promise, never resolve with garbage
(GPU.isWebGPUSupported ? test : skip)('build failure rejects the kernel promise webgpu', async assert => {
  if (!(await webgpuAdapter(assert))) return;
  assert.expect(2);
  const gpu = new GPU({ mode: 'webgpu' });
  const kernel = gpu.createKernel(function(v) {
    return notARealFunction(v[this.thread.x]); // eslint-disable-line no-undef
  }, { output: [4] });
  let error = null;
  try {
    await kernel([1, 2, 3, 4]);
  } catch (e) {
    error = e;
  }
  assert.ok(error instanceof Error, 'build failure surfaces as an Error');
  assert.ok(error && error.message.length > 0, 'rejection carries a message');
  await gpu.destroy();
});

// Inverted guard: runs under Node and non-WebGPU browsers, where requesting
// webgpu mode must fail loudly at construction, not at first kernel call.
(!GPU.isWebGPUSupported ? test : skip)('mode webgpu throws where unsupported', assert => {
  assert.expect(1);
  let error = null;
  try {
    const gpu = new GPU({ mode: 'webgpu' });
    gpu.createKernel(function() {
      return 1;
    }, { output: [1] });
  } catch (e) {
    error = e;
  }
  assert.ok(error instanceof Error && /webgpu/i.test(error.message), `explains why: ${error && error.message}`);
});

(GPU.isWebGPUSupported ? test : skip)('an output past the device buffer limit throws, never zeros', async assert => {
  if (!(await webgpuAdapter(assert))) return;
  assert.expect(1);
  // past the limit, bind-group validation fails asynchronously and the
  // zero-initialized staging buffer would resolve an all-zeros result; the
  // backend must throw before any of that
  const gpu = new GPU({ mode: 'webgpu' });
  const kernel = gpu.createKernel(function () {
    return 1;
  }, { output: [100000, 100000] });
  let message = '';
  try {
    await kernel();
  } catch (e) {
    message = String(e && e.message || e);
  }
  assert.ok(/maxStorageBufferBindingSize/.test(message), `names the limit: ${ message.slice(0, 90) }`);
  await gpu.destroy();
});
