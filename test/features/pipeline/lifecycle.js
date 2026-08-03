const { assert, skip, test, module: describe } = require('qunit');
const { GPU } = require('../../../src');

describe('features: pipeline lifecycle');

function makeSolver(mode, sweeps) {
  const gpu = new GPU({ mode });
  let traceCount = 0;
  const sweep = gpu.createKernel(function (u) {
    return u[this.thread.x] + 1;
  }, { output: [4] });
  const solve = gpu.createPipeline(function (u) {
    traceCount++;
    for (let s = 0; s < this.constants.sweeps; s++) {
      u = sweep(u);
    }
    return u;
  }, { constants: { sweeps } });
  return { gpu, solve, traces: () => traceCount };
}

test('calling a pipeline always returns a Promise', assert => {
  const { gpu, solve } = makeSolver('cpu', 2);
  const promise = solve([1, 2, 3, 4]);
  assert.ok(promise instanceof Promise);
  return promise.then(() => gpu.destroy());
});

test('the orchestration function runs once, at the first call', async assert => {
  const { gpu, solve, traces } = makeSolver('cpu', 2);
  assert.equal(traces(), 0, 'not traced at createPipeline');
  assert.deepEqual(Array.from(await solve([1, 2, 3, 4])), [3, 4, 5, 6]);
  assert.equal(traces(), 1, 'traced at the first call');
  assert.deepEqual(Array.from(await solve([5, 6, 7, 8])), [7, 8, 9, 10]);
  assert.equal(traces(), 1, 'later calls replay the plan');
  gpu.destroy();
});

test('setConstants invalidates the plan and re-traces on the next call', async assert => {
  const { gpu, solve, traces } = makeSolver('cpu', 2);
  assert.deepEqual(Array.from(await solve([0, 0, 0, 0])), [2, 2, 2, 2]);
  solve.setConstants({ sweeps: 5 });
  assert.equal(traces(), 1, 'setConstants alone does not trace');
  assert.deepEqual(Array.from(await solve([0, 0, 0, 0])), [5, 5, 5, 5], 'new constants took effect');
  assert.equal(traces(), 2, 're-traced exactly once');
  gpu.destroy();
});

test('closure-captured mutables freeze at trace, like constants', async assert => {
  const gpu = new GPU({ mode: 'cpu' });
  const offset = gpu.createKernel(function (u, o) {
    return u[this.thread.x] + o[this.thread.x];
  }, { output: [4] });
  const captured = [10, 20, 30, 40];
  const solve = gpu.createPipeline(function (u) {
    return offset(u, captured);
  });
  assert.deepEqual(Array.from(await solve([1, 1, 1, 1])), [11, 21, 31, 41]);
  captured[0] = 9999;
  assert.deepEqual(Array.from(await solve([1, 1, 1, 1])), [11, 21, 31, 41], 'trace-time value survives the mutation');
  gpu.destroy();
});

test('pipeline arguments are sampled at call time', async assert => {
  const { gpu, solve } = makeSolver('cpu', 1);
  const input = new Float32Array([1, 2, 3, 4]);
  const promise = solve(input);
  input[0] = 9999;
  assert.deepEqual(Array.from(await promise), [2, 3, 4, 5], 'mutation after the call is not observed');
  gpu.destroy();
});

test('concurrent calls serialize and both resolve correctly', async assert => {
  const { gpu, solve, traces } = makeSolver('cpu', 3);
  const first = solve([0, 0, 0, 0]);
  const second = solve([10, 10, 10, 10]);
  const results = await Promise.all([first, second]);
  assert.deepEqual(Array.from(results[0]), [3, 3, 3, 3]);
  assert.deepEqual(Array.from(results[1]), [13, 13, 13, 13]);
  assert.equal(traces(), 1, 'the build ran once even with a call queued behind it');
  gpu.destroy();
});

test('destroy releases the pipeline; later calls reject', async assert => {
  const { gpu, solve } = makeSolver('cpu', 2);
  await solve([1, 2, 3, 4]);
  await solve.destroy();
  assert.equal(solve.plan, null, 'plan released');
  await assert.rejects(solve([1, 2, 3, 4]), /pipeline has been destroyed/);
  await solve.destroy();
  assert.ok(true, 'double destroy tolerated');
  gpu.destroy();
});

test('gpu.destroy reaches pipelines', async assert => {
  const { gpu, solve } = makeSolver('cpu', 2);
  await solve([1, 2, 3, 4]);
  assert.equal(gpu.pipelines.length, 1, 'pipeline registered on the gpu');
  await gpu.destroy();
  assert.equal(gpu.pipelines.length, 0, 'registry emptied');
  await assert.rejects(solve([1, 2, 3, 4]), /pipeline has been destroyed/);
});

test('the user kernel is not observably reconfigured by pipeline use', async assert => {
  const { gpu, solve } = makeSolver('cpu', 2);
  const direct = gpu.createKernel(function (u) {
    return u[this.thread.x] * 2;
  }, { output: [4] });
  const combined = gpu.createPipeline(function (u) {
    return direct(u);
  });
  await combined([1, 2, 3, 4]);
  assert.equal(direct.pipeline, false, 'pipeline flag untouched');
  assert.equal(direct.immutable, false, 'immutable flag untouched');
  const plain = direct([1, 2, 3, 4]);
  assert.ok(plain instanceof Float32Array, 'direct call still renders a plain array');
  assert.deepEqual(Array.from(plain), [2, 4, 6, 8]);
  await solve([1, 2, 3, 4]);
  gpu.destroy();
});

(GPU.isHeadlessGLSupported ? test : skip)('destroy releases GL textures without breaking the shared context', async assert => {
  const gpu = new GPU({ mode: 'headlessgl' });
  const inc = gpu.createKernel(function (u) {
    return u[this.thread.x] + 1;
  }, { output: [4] });
  const solve = gpu.createPipeline(function (u) {
    return inc(inc(u));
  });
  assert.deepEqual(Array.from(await solve([1, 2, 3, 4])), [3, 4, 5, 6]);
  await solve.destroy();
  // the user's kernel shares the context the pipeline's clones just left
  assert.deepEqual(Array.from(inc([1, 2, 3, 4])), [2, 3, 4, 5], 'context survives the pipeline teardown');
  gpu.destroy();
});

(GPU.isHeadlessGLSupported ? test : skip)('intermediates stay resident: one readback per call headlessgl', async assert => {
  // the generic executor keeps step outputs as textures end-to-end; only
  // the final result crosses back to JS, so gl.readPixels must fire exactly
  // once per pipeline call no matter how many steps ran
  const gpu = new GPU({ mode: 'headlessgl' });
  const sweep = gpu.createKernel(function (u) {
    return u[this.thread.x] + 1;
  }, { output: [8] });
  const solve = gpu.createPipeline(function (u) {
    for (let s = 0; s < 6; s++) {
      u = sweep(u);
    }
    return u;
  });
  await solve([0, 0, 0, 0, 0, 0, 0, 0]);
  const gl = gpu.context;
  let readbacks = 0;
  const originalReadPixels = gl.readPixels.bind(gl);
  gl.readPixels = function() {
    readbacks++;
    return originalReadPixels.apply(this, arguments);
  };
  const result = await solve([1, 1, 1, 1, 1, 1, 1, 1]);
  gl.readPixels = originalReadPixels;
  assert.deepEqual(Array.from(result), [7, 7, 7, 7, 7, 7, 7, 7]);
  assert.equal(readbacks, 1, 'six steps, one readback');
  gpu.destroy();
});

(GPU.isHeadlessGLSupported ? test : skip)('repeated calls do not accumulate textures headlessgl', async assert => {
  // the executor parks step outputs in plan buffer slots and releases the
  // previous occupant; per-call texture population must therefore be flat
  const gpu = new GPU({ mode: 'headlessgl' });
  const sweep = gpu.createKernel(function (u) {
    return u[this.thread.x] * 0.5 + 1;
  }, { output: [16] });
  const solve = gpu.createPipeline(function (u) {
    for (let s = 0; s < 8; s++) {
      u = sweep(u);
    }
    return u;
  });
  const input = new Float32Array(16).fill(1);
  await solve(input);
  // GL textures are raw context handles behind refcounts, so the context is
  // the only honest census: a slot occupant dropped without release leaks
  // its handle forever (net > 0), and a plan that fails to ping-pong holds
  // every step's output at once (peak ~ steps, not ~ buffers)
  const gl = gpu.context;
  let live = 0;
  let peak = 0;
  const originalCreate = gl.createTexture.bind(gl);
  const originalDelete = gl.deleteTexture.bind(gl);
  gl.createTexture = () => {
    live++;
    peak = Math.max(peak, live);
    return originalCreate();
  };
  gl.deleteTexture = texture => {
    live--;
    return originalDelete(texture);
  };
  for (let i = 0; i < 5; i++) {
    await solve(input);
  }
  gl.createTexture = originalCreate;
  gl.deleteTexture = originalDelete;
  assert.equal(live, 0, 'no texture handles leaked across 5 calls');
  assert.ok(peak <= 3, `peak live intermediates bounded by the two plan buffers, saw ${ peak }`);
  gpu.destroy();
});

test('threads: false pins the webasm lowering to fused-sync', async assert => {
  if (!GPU.isWebAssemblySupported || typeof SharedArrayBuffer === 'undefined') { assert.ok(true, 'no threads here anyway'); return; }
  const gpu = new GPU({ mode: 'webasm' });
  const k = gpu.createKernel(function (a) { return a[this.thread.x] + 1; }, { output: [16384] });
  const threaded = gpu.createPipeline(function (v) { return k(v); });
  const pinned = gpu.createPipeline(function (v) { return k(v); }, { threads: false });
  const data = new Float32Array(16384).fill(3);
  await threaded(data);
  await pinned(data);
  assert.equal(threaded.executorKind, 'fused-threaded', 'big plans thread by default');
  assert.equal(pinned.executorKind, 'fused-sync', 'threads: false keeps the plan single-threaded');
  await gpu.destroy();
});

test('backend reports the executing clones\' mode, cpu', async assert => {
  const gpu = new GPU({ mode: 'cpu' });
  const k = gpu.createKernel(function (a) { return a[this.thread.x] + 1; }, { output: [4] });
  const p = gpu.createPipeline(function (v) { return k(v); });
  assert.equal(p.backend, null, 'null before the first call builds the plan');
  await p([1, 2, 3, 4]);
  assert.equal(p.backend, 'cpu');
  await gpu.destroy();
});

test('eager-upload fast path keeps call-time sampling headlessgl', async assert => {
  if (!GPU.isHeadlessGLSupported) { assert.ok(true, 'no headlessgl'); return; }
  const gpu = new GPU({ mode: 'headlessgl' });
  const k = gpu.createKernel(function (a) { return a[this.thread.x] + 1; }, { output: [4] });
  const p = gpu.createPipeline(function (v) { return k(v); });
  await p([1, 2, 3, 4]); // plan built; pipeline quiescent -> next call is eager
  // the settled-generic sentinel is what arms the fast path; testing null
  // instead of false once made it dead code on every GL pipeline
  assert.equal(p.pipeline._executor, false, 'eager fast path arms after generic settles');
  const data = new Float32Array([10, 20, 30, 40]);
  const pending = p(data);
  data.fill(0); // mutated between call and settlement
  assert.deepEqual(Array.from(await pending), [11, 21, 31, 41], 'sampled at call, not at run');
  // overlapped calls take the copy path and sample independently
  const a = p(new Float32Array([1, 1, 1, 1]));
  const b = p(new Float32Array([2, 2, 2, 2]));
  assert.deepEqual(Array.from(await a), [2, 2, 2, 2]);
  assert.deepEqual(Array.from(await b), [3, 3, 3, 3]);
  await gpu.destroy();
});
