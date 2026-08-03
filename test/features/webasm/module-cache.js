const { assert, skip, test, module: describe } = require('qunit');
const { GPU } = require('../../../src');

describe('features: webasm module cache');

const THREADS_AVAILABLE = GPU.isWebAssemblySupported && typeof SharedArrayBuffer !== 'undefined';

// every size signature instantiates a module over its own WebAssembly.Memory,
// which is near-invisible to JS heap accounting and pins a large virtual
// reservation -- so the cache is LRU-bounded and evicted entries are scrubbed
// (#870). Correctness must survive eviction: a revisited size re-instantiates.

test('a size sweep does not grow the cache past the bound', () => {
  const gpu = new GPU({ mode: 'webasm' });
  const kernel = gpu.createKernel(function (a) {
    return a[this.thread.x] + 1;
  }, { output: [4], dynamicOutput: true, dynamicArguments: true });
  kernel.setOutput([4]);
  assert.deepEqual(Array.from(kernel([1, 2, 3, 4])), [2, 3, 4, 5]);
  const inner = kernel.kernel;
  inner.moduleCacheLimit = 3;
  for (let size = 5; size <= 14; size++) {
    kernel.setOutput([size]);
    const input = new Float32Array(size).fill(size);
    assert.equal(kernel(input)[0], size + 1, `size ${ size } computes`);
  }
  assert.ok(inner._moduleCache.size <= 3, `cache stays bounded (${ inner._moduleCache.size })`);
  // the first size was evicted long ago; revisiting must re-instantiate
  kernel.setOutput([4]);
  assert.deepEqual(Array.from(kernel([1, 2, 3, 4])), [2, 3, 4, 5], 'evicted signature revives');
  gpu.destroy();
});

test('destroy scrubs every cached entry', async assert => {
  const gpu = new GPU({ mode: 'webasm' });
  const kernel = gpu.createKernel(function () {
    return this.thread.x;
  }, { output: [8] });
  kernel();
  const entries = Array.from(kernel.kernel._moduleCache.values());
  assert.equal(entries.length, 1);
  await gpu.destroy();
  assert.equal(entries[0].memory, null, 'the wasm memory reference is dropped');
  assert.equal(entries[0].instance, null, 'the instance reference is dropped');
});

(THREADS_AVAILABLE ? test : skip)('threaded entries survive eviction and release worker instantiations', async assert => {
  const gpu = new GPU({ mode: 'webasm' });
  const kernel = gpu.createKernel(function (a) {
    return a[this.thread.x] * 2;
  }, { output: [8192], asyncMode: true, dynamicOutput: true, dynamicArguments: true });
  const first = new Float32Array(8192).fill(3);
  assert.equal((await kernel(first))[0], 6);
  const firstEntry = kernel.kernel._active;
  const firstId = firstEntry.id;
  kernel.kernel.moduleCacheLimit = 1;
  // each size change now evicts the previous shared entry after its tail
  // settles; the pool must drop the worker-side instantiation and the next
  // revisit must set a fresh one up
  kernel.setOutput([12288]);
  const second = new Float32Array(12288).fill(5);
  assert.equal((await kernel(second))[0], 10);
  // the eviction's deferred release has settled by now (it was queued on
  // the tail ahead of the run just awaited): the entry must be scrubbed and
  // no worker may still hold its instantiation
  assert.equal(firstEntry.memory, null, 'evicted shared entry is scrubbed');
  const pool = kernel.kernel._pool;
  assert.ok(pool.workers.every(worker => !worker.state.setup.has(firstId)),
    'no worker retains the evicted instantiation');
  kernel.setOutput([8192]);
  assert.equal((await kernel(first))[0], 6, 'revisiting the evicted size still computes threaded');
  assert.equal(kernel.kernel._moduleCache.size, 1);
  await gpu.destroy();
});
