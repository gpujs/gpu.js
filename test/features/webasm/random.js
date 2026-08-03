const { assert, skip, test, module: describe } = require('qunit');
const { GPU, WebAssemblyKernel } = require('../../../src');

describe('features: webasm random');

// Math.random on webasm is the webgpu backend's PCG in native i32 wasm:
// per-cell state seeded from (seed + cellIndex * 0x9E3779B9) plus one LCG
// advance, RXS-M-XS output, top 24 bits into [0, 1). Integer arithmetic end
// to end, so with randomSeed the stream is bit-exact across runs, platforms,
// and any future work split.

test('draws land in [0, 1) and vary per thread webasm', assert => {
  assert.expect(4);
  const gpu = new GPU({ mode: 'webasm' });
  const kernel = gpu.createKernel(function() {
    return Math.random();
  }, { output: [4096] });
  const draws = kernel();
  assert.ok(draws.every(v => v >= 0 && v < 1), 'all in [0, 1)');
  const mean = draws.reduce((a, b) => a + b, 0) / draws.length;
  assert.ok(Math.abs(mean - 0.5) < 0.05, `mean near 0.5 (${ mean.toFixed(4) })`);
  const distinct = new Set(draws).size;
  assert.ok(distinct > 4000, `threads decorrelated (${ distinct } distinct of 4096)`);
  let adjacentEqual = 0;
  for (let i = 1; i < draws.length; i++) {
    if (draws[i] === draws[i - 1]) adjacentEqual++;
  }
  assert.equal(adjacentEqual, 0, 'no adjacent-thread repeats');
  gpu.destroy();
});

test('draws advance within a thread webasm', assert => {
  assert.expect(1);
  const gpu = new GPU({ mode: 'webasm' });
  const kernel = gpu.createKernel(function() {
    const a = Math.random();
    const b = Math.random();
    return a === b ? 1 : 0;
  }, { output: [1024] });
  const stuck = kernel().reduce((sum, v) => sum + v, 0);
  assert.equal(stuck, 0, 'consecutive draws differ in every thread');
  gpu.destroy();
});

test('unseeded runs differ webasm', assert => {
  assert.expect(1);
  const gpu = new GPU({ mode: 'webasm' });
  const kernel = gpu.createKernel(function() {
    return Math.random();
  }, { output: [64] });
  const first = Array.from(kernel());
  const second = Array.from(kernel());
  assert.notDeepEqual(first, second, 'the host reseeds every run');
  gpu.destroy();
});

test('randomSeed pins the stream bit-exact webasm', assert => {
  assert.expect(2);
  const gpu = new GPU({ mode: 'webasm' });
  const seeded = gpu.createKernel(function() {
    return Math.random();
  }, { output: [64], randomSeed: 1234 });
  const first = Array.from(seeded());
  const second = Array.from(seeded());
  assert.deepEqual(first, second, 'same seed, same stream, every run');
  const other = gpu.createKernel(function() {
    return Math.random();
  }, { output: [64], randomSeed: 4321 });
  assert.notDeepEqual(first, Array.from(other()), 'a different seed is a different stream');
  gpu.destroy();
});

const SIMD_AVAILABLE = GPU.isWebAssemblySupported && WebAssemblyKernel.isSIMDSupported;

(SIMD_AVAILABLE ? test : skip)('seeded stream is identical on the SIMD and scalar paths webasm', assert => {
  assert.expect(3);
  // width 64 runs entirely through run_simd, width 63 mostly scalar-tails —
  // the first 63 draws must match bit for bit because seeding is per cell,
  // not per stride
  const gpu = new GPU({ mode: 'webasm' });
  const wide = gpu.createKernel(function() {
    return Math.random();
  }, { output: [64], randomSeed: 99 });
  const narrow = gpu.createKernel(function() {
    return Math.random();
  }, { output: [63], randomSeed: 99 });
  const wideDraws = wide();
  const narrowDraws = narrow();
  assert.equal(wide.kernel._lastRunPath, 'simd');
  assert.equal(narrow.kernel._lastRunPath, 'simd+scalar-tail');
  assert.deepEqual(Array.from(narrowDraws), Array.from(wideDraws.slice(0, 63)));
  gpu.destroy();
});
