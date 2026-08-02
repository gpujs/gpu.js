const { assert, skip, test, module: describe } = require('qunit');
const { GPU } = require('../../../src');

describe('features: webgpu random');

// Math.random on webgpu is PCG: u32 state per thread seeded from a per-run
// seed slot and the thread id, RXS-M-XS output permutation, top 24 bits
// scaled into [0, 1). Integer arithmetic end to end, so with randomSeed the
// stream is bit-exact -- across runs and across drivers -- unlike the GL
// backends' precision-sensitive sin-fract hash.

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

(GPU.isWebGPUSupported ? test : skip)('draws land in [0, 1) and vary per thread webgpu', async assert => {
  if (!(await webgpuAdapter(assert))) return;
  assert.expect(4);
  const gpu = new GPU({ mode: 'webgpu' });
  const kernel = gpu.createKernel(function () {
    return Math.random();
  }, { output: [4096] });
  const draws = await kernel();
  assert.ok(draws.every(v => v >= 0 && v < 1), 'all in [0, 1)');
  const mean = draws.reduce((a, b) => a + b, 0) / draws.length;
  assert.ok(Math.abs(mean - 0.5) < 0.05, `mean near 0.5 (${ mean.toFixed(4) })`);
  const distinct = new Set(draws).size;
  assert.ok(distinct > 4000, `threads decorrelated (${ distinct } distinct of 4096)`);
  // adjacent threads must not walk in step
  let adjacentEqual = 0;
  for (let i = 1; i < draws.length; i++) {
    if (draws[i] === draws[i - 1]) adjacentEqual++;
  }
  assert.equal(adjacentEqual, 0, 'no adjacent-thread repeats');
  await gpu.destroy();
});

(GPU.isWebGPUSupported ? test : skip)('draws advance within a thread webgpu', async assert => {
  if (!(await webgpuAdapter(assert))) return;
  assert.expect(1);
  const gpu = new GPU({ mode: 'webgpu' });
  const kernel = gpu.createKernel(function () {
    const first = Math.random();
    const second = Math.random();
    return first === second ? 1 : 0;
  }, { output: [1024] });
  const collisions = Array.from(await kernel()).reduce((a, b) => a + b, 0);
  assert.equal(collisions, 0, 'consecutive draws differ in every thread');
  await gpu.destroy();
});

(GPU.isWebGPUSupported ? test : skip)('randomSeed reproduces the stream bit-exactly webgpu', async assert => {
  if (!(await webgpuAdapter(assert))) return;
  assert.expect(3);
  const gpu = new GPU({ mode: 'webgpu' });
  const make = seed => gpu.createKernel(function () {
    return Math.random();
  }, { output: [256], randomSeed: seed });
  const a = Array.from(await make(1234)());
  const b = Array.from(await make(1234)());
  const c = Array.from(await make(5678)());
  assert.deepEqual(a, b, 'same seed, identical streams');
  assert.notDeepEqual(a, c, 'different seed, different stream');
  const again = Array.from(await make(1234)());
  assert.deepEqual(a, again, 'stable across repeat runs');
  await gpu.destroy();
});

(GPU.isWebGPUSupported ? test : skip)('unseeded runs differ webgpu', async assert => {
  if (!(await webgpuAdapter(assert))) return;
  assert.expect(1);
  const gpu = new GPU({ mode: 'webgpu' });
  const kernel = gpu.createKernel(function () {
    return Math.random();
  }, { output: [64] });
  const first = Array.from(await kernel());
  const second = Array.from(await kernel());
  assert.notDeepEqual(first, second, 'a fresh seed every run');
  await gpu.destroy();
});
