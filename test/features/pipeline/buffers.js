const { assert, skip, test, module: describe } = require('qunit');
const { GPU } = require('../../../src');

describe('features: pipeline buffers');

// Buffer assignment is computed at trace time from static liveness, so the
// plan structure is asserted directly (the plan is exposed for exactly this
// and for later fused executors), with numeric proof alongside where the
// wrong assignment would corrupt values.

test('ping-pong loop compiles to ONE kernel and two alternating buffers', async assert => {
  const gpu = new GPU({ mode: 'cpu' });
  const sweep = gpu.createKernel(function (u, q) {
    return u[this.thread.x] * 0.5 + q[this.thread.x];
  }, { output: [4] });
  const solve = gpu.createPipeline(function (u, q) {
    for (let s = 0; s < this.constants.sweeps; s++) {
      u = sweep(u, q);
    }
    return u;
  }, { constants: { sweeps: 5 } });
  await solve([1, 2, 3, 4], [1, 1, 1, 1]);

  const plan = solve.plan;
  assert.equal(plan.kernels.length, 1, 'one kernel entry despite five recorded calls');
  assert.equal(plan.steps.length, 5, 'the JS loop unrolled into five steps');
  assert.equal(plan.buffers.length, 2, 'two buffers, not five');
  assert.deepEqual(plan.steps.map(step => step.outputBuffer), [0, 1, 0, 1, 0], 'slots alternate');
  assert.deepEqual(plan.steps[0].argBindings, [
    { source: 'pipelineArg', index: 0 },
    { source: 'pipelineArg', index: 1 },
  ], 'first step reads the pipeline args');
  assert.deepEqual(plan.steps[1].argBindings[0], { source: 'step', step: 0 }, 'later steps read the previous step');
  gpu.destroy();
});

test('a linear chain reuses slots instead of allocating per step', async assert => {
  const gpu = new GPU({ mode: 'cpu' });
  const inc = gpu.createKernel(function (u) {
    return u[this.thread.x] + 1;
  }, { output: [4] });
  const solve = gpu.createPipeline(function (u) {
    return inc(inc(inc(inc(u))));
  });
  await solve([0, 0, 0, 0]);
  assert.equal(solve.plan.steps.length, 4);
  assert.equal(solve.plan.buffers.length, 2, 'four steps ping-pong over two slots');
  gpu.destroy();
});

function livenessKeepsEarlyOutputAlive(mode) {
  return async assert => {
    // step 3 reads step 1's output, not just the previous step: if the
    // middle step's write reused step 1's slot the final values would be
    // built from clobbered data
    const gpu = new GPU({ mode });
    const inc = gpu.createKernel(function (u) {
      return u[this.thread.x] + 1;
    }, { output: [4] });
    const dbl = gpu.createKernel(function (u) {
      return u[this.thread.x] * 2;
    }, { output: [4] });
    const mix = gpu.createKernel(function (a, b) {
      return a[this.thread.x] * 100 + b[this.thread.x];
    }, { output: [4] });
    const solve = gpu.createPipeline(function (u) {
      const a = inc(u);
      const b = dbl(a);
      return mix(b, a);
    });

    const result = await solve([1, 2, 3, 4]);
    // a = u+1, b = 2a, result = 100b + a
    assert.deepEqual(Array.from(result), [402, 603, 804, 1005], 'step 1 output survived to step 3');
    const plan = solve.plan;
    assert.equal(plan.buffers.length, 3, 'step 1 output kept alive in its own slot');
    assert.notEqual(plan.steps[1].outputBuffer, plan.steps[0].outputBuffer, 'the middle step did not overwrite it');
    await gpu.destroy();
  };
}

test('liveness keeps a non-adjacent output alive cpu', livenessKeepsEarlyOutputAlive('cpu'));
test('liveness keeps a non-adjacent output alive webasm', livenessKeepsEarlyOutputAlive('webasm'));
(GPU.isHeadlessGLSupported ? test : skip)('liveness keeps a non-adjacent output alive headlessgl', livenessKeepsEarlyOutputAlive('headlessgl'));

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

(GPU.isWebGPUSupported ? test : skip)('liveness keeps a non-adjacent output alive webgpu', async assert => {
  if (!(await webgpuAdapter(assert))) return;
  return livenessKeepsEarlyOutputAlive('webgpu')(assert);
});

test('slots are only shared between steps of identical output shape', async assert => {
  const gpu = new GPU({ mode: 'cpu' });
  const wide = gpu.createKernel(function (u) {
    return u[this.thread.x % 4] + 1;
  }, { output: [8] });
  const narrow = gpu.createKernel(function (u) {
    return u[this.thread.x] + u[this.thread.x + 4];
  }, { output: [4] });
  const wideAgain = gpu.createKernel(function (u) {
    return u[this.thread.x % 4] * 2;
  }, { output: [8] });
  const solve = gpu.createPipeline(function (u) {
    return wideAgain(narrow(wide(u)));
  });
  await solve([1, 2, 3, 4]);
  const plan = solve.plan;
  assert.equal(plan.buffers.length, 2, 'the [4] step cannot share the [8] slot; the last [8] step can');
  assert.equal(plan.steps[2].outputBuffer, plan.steps[0].outputBuffer, 'shape-matched slot reused');
  assert.deepEqual(plan.buffers.map(buffer => buffer.output), [[8], [4]]);
  gpu.destroy();
});
