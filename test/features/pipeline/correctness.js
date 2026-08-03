const { assert, skip, test, module: describe } = require('qunit');
const { GPU } = require('../../../src');

describe('features: pipeline correctness');

// Every scenario runs against a plain-JS reference on every backend
// available here (cpu, webasm, headlessgl where supported, and webgpu in a
// browser with an adapter). executorKind is asserted per mode: webasm
// compiles these plans to the fused executor, and a forced-generic webasm
// variant keeps the correctness-reference executor covered on that backend
// too. webgpu rows force the generic executor so the correctness reference
// stays covered over buffer-handle intermediates; the fused-encoder lowering
// has its own suite in fused-webgpu.js.

function assertClose(assert, actual, expected, label) {
  const values = Array.from(actual);
  assert.equal(values.length, expected.length, `${ label }: length`);
  for (let i = 0; i < values.length; i++) {
    const delta = Math.abs(values[i] - expected[i]);
    const scale = Math.max(Math.abs(expected[i]), 1);
    assert.ok(delta / scale <= 1e-5, `${ label } cell ${ i }: ${ values[i] } vs ${ expected[i] }`);
  }
}

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

function eachMode(name, body) {
  test(`${ name } cpu`, assert => body(assert, 'cpu', 'generic'));
  test(`${ name } webasm`, assert => body(assert, 'webasm', 'fused-sync'));
  test(`${ name } webasm (generic forced)`, assert => body(assert, 'webasm', 'generic'));
  (GPU.isHeadlessGLSupported ? test : skip)(`${ name } headlessgl`, assert => body(assert, 'headlessgl', 'generic'));
  (GPU.isWebGPUSupported ? test : skip)(`${ name } webgpu`, async assert => {
    if (!(await webgpuAdapter(assert))) return;
    return body(assert, 'webgpu', 'generic');
  });
}

// the test/benchmark hook: fusion is skipped entirely, the plan runs generic
function applyExecutor(shortcut, expectedKind) {
  if (expectedKind === 'generic') {
    shortcut.pipeline._fusionDisabled = true;
  }
}

eachMode('jacobi-like ping-pong through one kernel', async (assert, mode, kind) => {
  const gpu = new GPU({ mode });
  const sweep = gpu.createKernel(function (u, q) {
    let left = this.thread.x - 1;
    if (left < 0) left = 0;
    let right = this.thread.x + 1;
    if (right > 7) right = 7;
    return 0.25 * (u[left] + u[right]) + q[this.thread.x];
  }, { output: [8] });
  const solve = gpu.createPipeline(function (u, q) {
    for (let s = 0; s < this.constants.sweeps; s++) {
      u = sweep(u, q);
    }
    return u;
  }, { constants: { sweeps: 6 } });
  applyExecutor(solve, kind);

  const u0 = [0, 1, 2, 3, 4, 5, 6, 7];
  const q = [1, 0.5, 1, 0.5, 1, 0.5, 1, 0.5];
  const result = await solve(u0, q);

  let expected = u0.slice();
  for (let s = 0; s < 6; s++) {
    expected = expected.map((_, x) => 0.25 * (expected[Math.max(x - 1, 0)] + expected[Math.min(x + 1, 7)]) + q[x]);
  }
  assert.equal(solve.executorKind, kind, `runs the ${ kind } executor`);
  assertClose(assert, result, expected, 'jacobi');
  await gpu.destroy();
});

eachMode('multi-kernel chain', async (assert, mode, kind) => {
  const gpu = new GPU({ mode });
  const double = gpu.createKernel(function (a) {
    return a[this.thread.x] * 2;
  }, { output: [6] });
  const addOne = gpu.createKernel(function (a) {
    return a[this.thread.x] + 1;
  }, { output: [6] });
  const mix = gpu.createKernel(function (a, b) {
    return a[this.thread.x] * b[this.thread.x];
  }, { output: [6] });
  const chain = gpu.createPipeline(function (x) {
    const a = double(x);
    const b = addOne(a);
    return mix(b, a);
  });
  applyExecutor(chain, kind);

  const x = [1, 2, 3, 4, 5, 6];
  const result = await chain(x);
  const expected = x.map(v => (v * 2 + 1) * (v * 2));
  assert.equal(chain.executorKind, kind);
  assertClose(assert, result, expected, 'chain');
  await gpu.destroy();
});

eachMode('multi-output object return', async (assert, mode, kind) => {
  const gpu = new GPU({ mode });
  const double = gpu.createKernel(function (a) {
    return a[this.thread.x] * 2;
  }, { output: [4] });
  const negate = gpu.createKernel(function (a) {
    return -a[this.thread.x];
  }, { output: [4] });
  const both = gpu.createPipeline(function (x) {
    return {
      doubled: double(x),
      negated: negate(x),
    };
  });
  applyExecutor(both, kind);

  const x = [1, 2, 3, 4];
  const result = await both(x);
  assert.equal(both.executorKind, kind);
  assert.deepEqual(Object.keys(result).sort(), ['doubled', 'negated'], 'resolves to the same object shape');
  assertClose(assert, result.doubled, [2, 4, 6, 8], 'doubled');
  assertClose(assert, result.negated, [-1, -2, -3, -4], 'negated');
  await gpu.destroy();
});

eachMode('array return resolves to an array of plain results', async (assert, mode, kind) => {
  const gpu = new GPU({ mode });
  const double = gpu.createKernel(function (a) {
    return a[this.thread.x] * 2;
  }, { output: [4] });
  const pair = gpu.createPipeline(function (x) {
    const once = double(x);
    return [once, double(once)];
  });
  applyExecutor(pair, kind);
  const result = await pair([1, 2, 3, 4]);
  assert.equal(pair.executorKind, kind);
  assert.equal(result.length, 2);
  assertClose(assert, result[0], [2, 4, 6, 8], 'first');
  assertClose(assert, result[1], [4, 8, 12, 16], 'second');
  await gpu.destroy();
});

eachMode('literal and closure-captured kernel arguments', async (assert, mode, kind) => {
  const gpu = new GPU({ mode });
  const scale = gpu.createKernel(function (a, k) {
    return a[this.thread.x] * k;
  }, { output: [4] });
  const offset = gpu.createKernel(function (a, o) {
    return a[this.thread.x] + o[this.thread.x];
  }, { output: [4] });
  const captured = [10, 20, 30, 40];
  const solve = gpu.createPipeline(function (x) {
    return offset(scale(x, 3), captured);
  });
  applyExecutor(solve, kind);

  const result = await solve([1, 2, 3, 4]);
  assert.equal(solve.executorKind, kind);
  assertClose(assert, result, [13, 26, 39, 52], 'literal scalar and captured array');
  await gpu.destroy();
});

eachMode('pipeline arg reused by several steps', async (assert, mode, kind) => {
  const gpu = new GPU({ mode });
  const add = gpu.createKernel(function (a, b) {
    return a[this.thread.x] + b[this.thread.x];
  }, { output: [4] });
  const solve = gpu.createPipeline(function (u, q) {
    const a = add(u, q);
    const b = add(a, q);
    return add(b, q);
  });
  applyExecutor(solve, kind);

  const result = await solve([1, 2, 3, 4], [10, 10, 10, 10]);
  assert.equal(solve.executorKind, kind);
  assertClose(assert, result, [31, 32, 33, 34], 'q consumed by three steps');
  await gpu.destroy();
});

eachMode('2d output kernels', async (assert, mode, kind) => {
  const gpu = new GPU({ mode });
  const grow = gpu.createKernel(function (m) {
    return m[this.thread.y][this.thread.x] + 1;
  }, { output: [3, 2] });
  const solve = gpu.createPipeline(function (m) {
    for (let i = 0; i < this.constants.passes; i++) {
      m = grow(m);
    }
    return m;
  }, { constants: { passes: 3 } });
  applyExecutor(solve, kind);

  const result = await solve([[0, 1, 2], [10, 11, 12]]);
  assert.equal(solve.executorKind, kind);
  assert.equal(result.length, 2, '2d shape survives readback');
  assertClose(assert, result[0], [3, 4, 5], 'row 0');
  assertClose(assert, result[1], [13, 14, 15], 'row 1');
  await gpu.destroy();
});

// the rows above force the generic executor; this one leaves fusion enabled
// so executor selection must land webgpu on its own fused encoder
(GPU.isWebGPUSupported ? test : skip)('webgpu compiles the fused encoder when fusion is left enabled', async assert => {
  if (!(await webgpuAdapter(assert))) return;
  const gpu = new GPU({ mode: 'webgpu' });
  const double = gpu.createKernel(function (a) {
    return a[this.thread.x] * 2;
  }, { output: [4] });
  const solve = gpu.createPipeline(function (x) {
    return double(double(x));
  });
  const result = await solve([1, 2, 3, 4]);
  assert.equal(solve.executorKind, 'fused-encoder', 'webgpu plans compile to the single-encoder executor');
  assert.equal(solve.fallbackReason, null, 'no fallback reason while fused');
  assertClose(assert, result, [4, 8, 12, 16], 'fused run is correct');
  await gpu.destroy();
});

test('generic executor survives argument size drift across calls headlessgl', async assert => {
  if (!GPU.isHeadlessGLSupported) { assert.ok(true, 'no headlessgl'); return; }
  // clones are statically typed and shaped since the mutable-clone rework;
  // a size change must rebuild them, not compute on stale dimensions
  const gpu = new GPU({ mode: 'headlessgl' });
  const k = gpu.createKernel(function (a) {
    return a[this.thread.x] * 2;
  }, { output: [4], dynamicOutput: true, dynamicArguments: true });
  const p = gpu.createPipeline(function (v) { return k(v); });
  assert.deepEqual(Array.from(await p([1, 2, 3, 4])), [2, 4, 6, 8]);
  k.setOutput([6]);
  p.setConstants({});
  assert.deepEqual(Array.from(await p([1, 2, 3, 4, 5, 6])), [2, 4, 6, 8, 10, 12], 'rebuilt for the new size');
  assert.deepEqual(Array.from(await p([6, 5, 4, 3, 2, 1])), [12, 10, 8, 6, 4, 2], 'steady after rebuild');
  await gpu.destroy();
});

test('generic pipeline results are caller-owned, not clone-owned cpu', async assert => {
  // mutable cpu clones re-render their arrays in place; a held result from
  // call N must not change when call N+1 runs
  const gpu = new GPU({ mode: 'cpu' });
  const k = gpu.createKernel(function (a) { return a[this.thread.x] + 1; }, { output: [3] });
  const p = gpu.createPipeline(function (v) { return k(v); });
  const first = await p([1, 2, 3]);
  await p([10, 20, 30]);
  assert.deepEqual(Array.from(first), [2, 3, 4], 'call N result survives call N+1');
  await gpu.destroy();
});
