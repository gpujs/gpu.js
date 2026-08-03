const { assert, skip, test, module: describe } = require('qunit');
const { GPU, WebAssemblyKernel } = require('../../../src');

describe('features: webasm simd and threads');

// The discriminating assertions here follow the backend's contract: every
// kernel's module carries a run_simd export next to run, the two are
// bit-identical per cell, and the threaded path must produce exactly the
// sync path's numbers however the work is split.

// a kernel with everything the vectorizer has to predicate: divergent
// if/else, a lane-varying trip count, a lane-scalarized import, and a
// lane-varying array load
function divergentSource(a) {
  let sum = 0;
  for (let i = 0; i < a[this.thread.x]; i++) {
    sum += Math.sin(i + 1);
  }
  if (a[this.thread.x] > 4) {
    sum = sum * 2 + a[this.thread.x];
  } else {
    sum = sum - 1;
  }
  return sum;
}

// the threaded path needs SharedArrayBuffer, which browsers only expose under
// cross-origin isolation (the dev server sends the headers; BrowserStack
// targets may not) -- Node always has it, so the thread tests always run there
const THREADS_AVAILABLE = typeof SharedArrayBuffer !== 'undefined';
// wasm SIMD itself is optional (Safari before 16.4): the backend falls back
// to the scalar export, so path assertions only hold where SIMD exists
const SIMD_AVAILABLE = GPU.isWebAssemblySupported && WebAssemblyKernel.isSIMDSupported;

(SIMD_AVAILABLE ? test : skip)('every module exports run_simd webasm', assert => {
  assert.expect(3);
  const gpu = new GPU({ mode: 'webasm' });
  const kernel = gpu.createKernel(divergentSource, { output: [8] });
  kernel([1, 6, 3, 8, 2, 7, 4, 5]);
  const entry = kernel.kernel._active;
  assert.equal(typeof entry.instance.exports.run, 'function');
  assert.equal(typeof entry.instance.exports.run_simd, 'function', 'divergent control flow vectorizes, it does not bail out');
  assert.equal(kernel.kernel._lastRunPath, 'simd', 'a width divisible by 4 runs entirely vectorized');
  gpu.destroy();
});

(SIMD_AVAILABLE ? test : skip)('run and run_simd are bit-identical webasm', assert => {
  const gpu = new GPU({ mode: 'webasm' });
  const kernel = gpu.createKernel(divergentSource, { output: [16] });
  const args = [1, 6, 3, 8, 2, 7, 4, 5, 0, 9, 12, 3, 6, 1, 8, 2];
  kernel(args); // uploads arguments and proves the kernel runs
  const entry = kernel.kernel._active;
  const cells = entry.cells;
  const base = entry.layout.outputOffset / 4;
  const span = cells * kernel.kernel.componentCount;
  const capture = runner => {
    entry.f32.fill(-999, base, base + span); // any stale cell would survive as -999
    runner(0, cells, 7);
    // Int32 views compare bit patterns, so "identical" means identical f32s,
    // not merely close ones
    return new Int32Array(entry.f32.slice(base, base + span).buffer);
  };
  const scalar = capture(entry.instance.exports.run);
  const simd = capture(entry.instance.exports.run_simd);
  assert.expect(span);
  for (let i = 0; i < span; i++) {
    assert.equal(simd[i], scalar[i], `cell ${ i }: simd bits ${ simd[i] } vs scalar bits ${ scalar[i] }`);
  }
  gpu.destroy();
});

(SIMD_AVAILABLE ? test : skip)('non-multiple-of-4 rows take the scalar tail and still match cpu webasm', assert => {
  assert.expect(2);
  const gpu = new GPU({ mode: 'webasm' });
  const cpu = new GPU({ mode: 'cpu' });
  const source = function(a) {
    return a[this.thread.y][this.thread.x] * 2 + this.thread.y;
  };
  const args = [[1, 2, 3, 4, 5, 6], [7, 8, 9, 10, 11, 12]];
  const kernel = gpu.createKernel(source, { output: [6, 2] });
  const actual = kernel(args);
  const expected = cpu.createKernel(source, { output: [6, 2] })(args);
  assert.equal(kernel.kernel._lastRunPath, 'simd+scalar-tail');
  assert.deepEqual(actual.map(row => Array.from(row)), expected.map(row => Array.from(row)));
  gpu.destroy();
  cpu.destroy();
});

(THREADS_AVAILABLE ? test : skip)('asyncMode with a large output runs on the pool webasm', async assert => {
  const gpu = new GPU({ mode: 'webasm' });
  const sync = new GPU({ mode: 'webasm' });
  const source = function(a) {
    return a[this.thread.x] * 2 + Math.sqrt(this.thread.x);
  };
  const args = new Float32Array(16384);
  for (let i = 0; i < args.length; i++) args[i] = (i * 7919) % 1000 / 10;
  const kernel = gpu.createKernel(source, { output: [16384], asyncMode: true });
  const pending = kernel(args);
  assert.ok(pending instanceof Promise, 'the async contract returns a Promise');
  const result = await pending;
  const expected = sync.createKernel(source, { output: [16384] })(args);
  assert.equal(kernel.kernel._lastRunPath, 'threaded');
  const pool = kernel.kernel._pool;
  assert.ok(pool !== null, 'the pool exists only after a threaded dispatch');
  assert.equal(pool.dispatchCount, 1);
  const expectedWorkers = Math.min(pool.size, Math.ceil(16384 / 4096));
  assert.equal(pool.lastDispatch.workerCount, expectedWorkers, `split across ${ expectedWorkers } workers`);
  assert.equal(pool.liveWorkerCount, expectedWorkers, 'exactly the assigned workers were spawned');
  const ranges = pool.lastDispatch.ranges;
  let covered = 0;
  let aligned = true;
  for (let i = 0; i < ranges.length; i++) {
    if (ranges[i][0] % 4 !== 0) aligned = false;
    if (ranges[i][0] !== covered) aligned = false;
    covered = ranges[i][1];
  }
  assert.ok(aligned && covered === 16384, 'contiguous 4-aligned ranges covering every cell');
  assert.deepEqual(Array.from(result), Array.from(expected), 'threaded result equals the sync path');
  gpu.destroy();
  sync.destroy();
});

(THREADS_AVAILABLE ? test : skip)('poolSize setting caps the split webasm', async assert => {
  assert.expect(2);
  const gpu = new GPU({ mode: 'webasm' });
  const kernel = gpu.createKernel(function() {
    return this.thread.x;
  }, { output: [16384], asyncMode: true, poolSize: 2 });
  await kernel();
  const pool = kernel.kernel._pool;
  assert.equal(pool.size, 2);
  assert.equal(pool.lastDispatch.workerCount, 2);
  gpu.destroy();
});

(THREADS_AVAILABLE ? test : skip)('seeded random is identical however the work splits webasm', async assert => {
  assert.expect(1);
  const gpu = new GPU({ mode: 'webasm' });
  const sync = new GPU({ mode: 'webasm' });
  const threaded = gpu.createKernel(function() {
    return Math.random();
  }, { output: [16384], asyncMode: true, randomSeed: 5 });
  const reference = sync.createKernel(function() {
    return Math.random();
  }, { output: [16384], randomSeed: 5 });
  const threadedDraws = await threaded(); // per-cell seeding: the split cannot show
  assert.deepEqual(Array.from(threadedDraws), Array.from(reference()));
  gpu.destroy();
  sync.destroy();
});

(THREADS_AVAILABLE ? test : skip)('threaded arguments are sampled at call time webasm', async assert => {
  assert.expect(1);
  const gpu = new GPU({ mode: 'webasm' });
  const kernel = gpu.createKernel(function(a) {
    return a[this.thread.x];
  }, { output: [4096], asyncMode: true });
  const buffer = new Float32Array(4096).fill(1);
  const pending = kernel(buffer);
  buffer[0] = 999; // after the call, before settlement: must not be seen
  const result = await pending;
  assert.equal(result[0], 1, 'the sync contract\'s call-time sampling holds under threads');
  gpu.destroy();
});

test('asyncMode below the threading threshold resolves the sync result webasm', async assert => {
  assert.expect(3);
  const gpu = new GPU({ mode: 'webasm' });
  const kernel = gpu.createKernel(function() {
    return this.thread.x * 2;
  }, { output: [64], asyncMode: true });
  const pending = kernel();
  assert.ok(pending instanceof Promise);
  const result = await pending;
  assert.deepEqual(Array.from(result.slice(0, 4)), [0, 2, 4, 6]);
  assert.equal(kernel.kernel._pool, null, 'no pool for a 64-cell output');
  gpu.destroy();
});

(THREADS_AVAILABLE ? test : skip)('destroy terminates the pool webasm', async assert => {
  assert.expect(2);
  const gpu = new GPU({ mode: 'webasm' });
  const kernel = gpu.createKernel(function() {
    return 1;
  }, { output: [8192], asyncMode: true });
  await kernel();
  const pool = kernel.kernel._pool;
  assert.ok(pool !== null && pool.destroyed === false);
  await gpu.destroy();
  assert.equal(pool.destroyed, true, 'gpu.destroy() tears the workers down');
});
