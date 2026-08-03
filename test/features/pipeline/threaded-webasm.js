const { assert, test, module: describe } = require('qunit');
const { GPU } = require('../../../src');

describe('features: pipeline threaded webasm executor');

// The threaded executor hands the WHOLE plan to pool workers: each worker
// owns a cell-range slice of every step and advances step-to-step on an
// Atomics barrier in the shared memory, so a pipeline call costs one pool
// dispatch however many steps the plan unrolls to. Every scenario asserts
// executorKind === 'fused-threaded' so a silent fall back to the sync or
// generic executor fails the suite. Plans here are sized past the threading
// floor (4096 cells per worker) — on a single-core host these tests would
// see 'fused-sync' and fail, which is a deliberate canary, not flake.

const N = 16384;

function assertClose(assert, actual, expected, label) {
  const values = Array.from(actual);
  assert.equal(values.length, expected.length, `${ label }: length`);
  let worst = 0;
  for (let i = 0; i < values.length; i++) {
    const delta = Math.abs(values[i] - expected[i]);
    const scale = Math.max(Math.abs(expected[i]), 1);
    worst = Math.max(worst, delta / scale);
  }
  assert.ok(worst <= 1e-5, `${ label }: worst relative delta ${ worst }`);
}

function makeJacobi(gpu, sweeps) {
  const sweep = gpu.createKernel(function (u, q) {
    let left = this.thread.x - 1;
    if (left < 0) left = 0;
    let right = this.thread.x + 1;
    if (right > this.constants.n - 1) right = this.constants.n - 1;
    return 0.25 * (u[left] + u[right]) + q[this.thread.x];
  }, { output: [N], constants: { n: N } });
  return gpu.createPipeline(function (u, q) {
    for (let s = 0; s < this.constants.sweeps; s++) {
      u = sweep(u, q);
    }
    return u;
  }, { constants: { sweeps } });
}

function jacobiArgs(shift) {
  const u0 = new Float32Array(N);
  const q = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    u0[i] = (i + shift) % 7;
    q[i] = ((i + shift) % 3) * 0.5;
  }
  return [u0, q];
}

test('big jacobi ping-pong runs fused-threaded and matches the cpu reference', async assert => {
  const webasm = new GPU({ mode: 'webasm' });
  const cpu = new GPU({ mode: 'cpu' });
  const solve = makeJacobi(webasm, 12);
  const reference = makeJacobi(cpu, 12);
  for (let call = 0; call < 3; call++) {
    const args = jacobiArgs(call * 5);
    const out = await solve.apply(null, args);
    const expected = await reference.apply(null, args);
    assertClose(assert, out, Array.from(expected), `call ${ call }`);
  }
  assert.equal(solve.executorKind, 'fused-threaded', 'the plan crossed the threading floor');
  assert.equal(solve.fallbackReason, null, 'no fallback reason while threaded');
  webasm.destroy();
  cpu.destroy();
});

test('2d chain runs fused-threaded and matches the cpu reference', async assert => {
  const make = gpu => {
    const blurX = gpu.createKernel(function (u) {
      let left = this.thread.x - 1;
      if (left < 0) left = 0;
      return 0.5 * (u[this.thread.y][this.thread.x] + u[this.thread.y][left]);
    }, { output: [128, 128] });
    const scale = gpu.createKernel(function (u, k) {
      return u[this.thread.y][this.thread.x] * k + this.thread.x;
    }, { output: [128, 128] });
    return gpu.createPipeline(function (u, k) {
      return scale(blurX(blurX(u)), k);
    });
  };
  const webasm = new GPU({ mode: 'webasm' });
  const cpu = new GPU({ mode: 'cpu' });
  const solve = make(webasm);
  const reference = make(cpu);
  const u0 = [];
  for (let y = 0; y < 128; y++) {
    const row = new Float32Array(128);
    for (let x = 0; x < 128; x++) row[x] = (x * 31 + y * 7) % 13;
    u0.push(row);
  }
  const out = await solve(u0, 3);
  const expected = await reference(u0, 3);
  for (let y = 0; y < 128; y++) {
    assertClose(assert, out[y], Array.from(expected[y]), `row ${ y }`);
  }
  assert.equal(solve.executorKind, 'fused-threaded');
  webasm.destroy();
  cpu.destroy();
});

// The barrier-correctness gauntlet: every step reads a cell HALFWAY across
// the array from the one it writes, so step s+1 consumes cells written by
// every worker's slice of step s — a missed fence surfaces as a stale read.
// All values are integers below 2^24, so f32 arithmetic is exact and any
// race shows up as a hard mismatch, not a tolerance question. Repeated runs
// shake scheduling: one pipeline hammered for many calls plus fresh
// pipelines whose worker startup timing differs.
test('cross-slice fence: step N+1 reads every slice of step N, repeatedly', async assert => {
  const STEPS = 10;
  const reference = u0 => {
    let u = Array.from(u0);
    for (let s = 0; s < STEPS; s++) {
      const next = new Array(N);
      for (let i = 0; i < N; i++) {
        let j = i + N / 2;
        if (j >= N) j -= N;
        next[i] = u[i] + u[j];
      }
      u = next;
    }
    return u;
  };
  const makeFence = gpu => {
    const fold = gpu.createKernel(function (u) {
      let j = this.thread.x + this.constants.half;
      if (j >= this.constants.n) j -= this.constants.n;
      return u[this.thread.x] + u[j];
    }, { output: [N], constants: { n: N, half: N / 2 } });
    return gpu.createPipeline(function (u) {
      for (let s = 0; s < this.constants.steps; s++) {
        u = fold(u);
      }
      return u;
    }, { constants: { steps: STEPS } });
  };
  const inputs = iteration => {
    const u0 = new Float32Array(N);
    for (let i = 0; i < N; i++) u0[i] = (i + iteration) % 17;
    return u0;
  };
  const verify = (out, expected, label) => {
    for (let i = 0; i < N; i++) {
      if (out[i] !== expected[i]) {
        assert.equal(out[i], expected[i], `${ label }: first mismatch at cell ${ i }`);
        return false;
      }
    }
    return true;
  };
  const gpu = new GPU({ mode: 'webasm' });
  const hammered = makeFence(gpu);
  let clean = true;
  for (let iteration = 0; iteration < 20 && clean; iteration++) {
    const u0 = inputs(iteration);
    clean = verify(await hammered(u0), reference(u0), `warm iteration ${ iteration }`);
  }
  assert.equal(hammered.executorKind, 'fused-threaded');
  for (let cold = 0; cold < 5 && clean; cold++) {
    const fresh = makeFence(gpu);
    const u0 = inputs(100 + cold);
    clean = verify(await fresh(u0), reference(u0), `cold pipeline ${ cold }`);
    assert.equal(fresh.executorKind, 'fused-threaded', `cold pipeline ${ cold } threaded`);
    await fresh.destroy();
  }
  assert.ok(clean, '25 iterations bit-exact across the barrier');
  gpu.destroy();
});

test('plans under the threading floor stay fused-sync', async assert => {
  const gpu = new GPU({ mode: 'webasm' });
  const inc = gpu.createKernel(function (u) {
    return u[this.thread.x] + 1;
  }, { output: [64] });
  const solve = gpu.createPipeline(function (u) {
    return inc(inc(u));
  });
  const out = await solve(new Float32Array(64).fill(1));
  assert.equal(out[0], 3);
  assert.equal(solve.executorKind, 'fused-sync', 'a 64-cell plan is not worth a worker pool');
  gpu.destroy();
});

test('_threadsDisabled keeps a big plan on the sync path', async assert => {
  const gpu = new GPU({ mode: 'webasm' });
  const solve = makeJacobi(gpu, 4);
  solve.pipeline._threadsDisabled = true;
  const args = jacobiArgs(0);
  const out = await solve.apply(null, args);
  assert.equal(out.length, N);
  assert.equal(solve.executorKind, 'fused-sync', 'threads unavailable falls back to sync fusion');
  gpu.destroy();
});

test('non-multiple-of-4 width takes the scalar worker path correctly', async assert => {
  const M = 8190;
  const make = gpu => {
    const sweep = gpu.createKernel(function (u) {
      let left = this.thread.x - 1;
      if (left < 0) left = 0;
      return u[this.thread.x] * 0.5 + u[left];
    }, { output: [M] });
    return gpu.createPipeline(function (u) {
      return sweep(sweep(sweep(u)));
    });
  };
  const webasm = new GPU({ mode: 'webasm' });
  const cpu = new GPU({ mode: 'cpu' });
  const u0 = new Float32Array(M);
  for (let i = 0; i < M; i++) u0[i] = i % 11;
  const out = await make(webasm)(u0);
  const expected = await make(cpu)(u0);
  assertClose(assert, out, Array.from(expected), 'scalar-path results');
  webasm.destroy();
  cpu.destroy();
});

test('one pool dispatch per call; worker slices tile every step exactly', async assert => {
  const gpu = new GPU({ mode: 'webasm' });
  const solve = makeJacobi(gpu, 32);
  const args = jacobiArgs(0);
  await solve.apply(null, args);
  assert.equal(solve.executorKind, 'fused-threaded');
  const executor = solve.pipeline._executor;
  const pool = executor.pool;
  const before = pool.dispatchCount;
  await solve.apply(null, args);
  await solve.apply(null, args);
  assert.equal(pool.dispatchCount - before, 2,
    'a 32-step plan costs ONE dispatch per call — step boundaries make no main-thread round trip');
  const entry = executor._entry;
  assert.equal(pool.lastDispatch.workerCount, entry.workerCount, 'every barrier participant got its task');
  assert.ok(entry.workerCount >= 2, 'the plan actually split');
  const stepCount = solve.plan.steps.length;
  assert.equal(entry.workerRanges[0].length, stepCount * 2, 'a range per worker per step');
  let violations = 0;
  for (let s = 0; s < stepCount; s++) {
    const spans = [];
    for (let w = 0; w < entry.workerCount; w++) {
      const start = entry.workerRanges[w][s * 2];
      const end = entry.workerRanges[w][s * 2 + 1];
      if (end > start) spans.push([start, end]);
    }
    spans.sort((a, b) => a[0] - b[0]);
    let cursor = 0;
    for (let i = 0; i < spans.length; i++) {
      if (spans[i][0] !== cursor) violations++;
      cursor = spans[i][1];
    }
    if (cursor !== N) violations++;
  }
  assert.equal(violations, 0, 'every step tiles [0, cells) with no gap or overlap');
  gpu.destroy();
});

test('concurrent calls serialize on the tail with per-call arguments', async assert => {
  const gpu = new GPU({ mode: 'webasm' });
  const cpu = new GPU({ mode: 'cpu' });
  const solve = makeJacobi(gpu, 8);
  const reference = makeJacobi(cpu, 8);
  const argSets = [jacobiArgs(1), jacobiArgs(2), jacobiArgs(3)];
  const outs = await Promise.all(argSets.map(args => solve.apply(null, args)));
  for (let i = 0; i < argSets.length; i++) {
    const expected = await reference.apply(null, argSets[i]);
    assertClose(assert, outs[i], Array.from(expected), `concurrent call ${ i }`);
  }
  assert.equal(solve.executorKind, 'fused-threaded');
  gpu.destroy();
  cpu.destroy();
});

test('argument size drift recompiles and stays threaded', async assert => {
  const gpu = new GPU({ mode: 'webasm' });
  const cpu = new GPU({ mode: 'cpu' });
  const solve = makeJacobi(gpu, 6);
  const reference = makeJacobi(cpu, 6);
  const args = jacobiArgs(0);
  await solve.apply(null, args);
  assert.equal(solve.executorKind, 'fused-threaded');
  // longer input: the kernel still reads [0, N) but the arg region resizes
  const grown = [new Float32Array(N + 512), args[1]];
  grown[0].set(args[0]);
  const out = await solve.apply(null, grown);
  const expected = await reference.apply(null, grown);
  assertClose(assert, out, Array.from(expected), 'post-drift results');
  assert.equal(solve.executorKind, 'fused-threaded', 'recompiled threaded for the new signature');
  gpu.destroy();
  cpu.destroy();
});

test('setConstants re-traces and the new plan threads again', async assert => {
  const gpu = new GPU({ mode: 'webasm' });
  const cpu = new GPU({ mode: 'cpu' });
  const solve = makeJacobi(gpu, 4);
  const reference = makeJacobi(cpu, 4);
  const args = jacobiArgs(0);
  await solve.apply(null, args);
  assert.equal(solve.plan.steps.length, 4);
  solve.setConstants({ sweeps: 9, n: N });
  reference.setConstants({ sweeps: 9, n: N });
  const out = await solve.apply(null, args);
  const expected = await reference.apply(null, args);
  assertClose(assert, out, Array.from(expected), 're-traced results');
  assert.equal(solve.plan.steps.length, 9, 'the re-traced plan has the new sweep count');
  assert.equal(solve.executorKind, 'fused-threaded');
  gpu.destroy();
  cpu.destroy();
});

test('Math.random draws a fresh seed per call across the pool', async assert => {
  const gpu = new GPU({ mode: 'webasm' });
  const noise = gpu.createKernel(function () {
    return Math.random();
  }, { output: [8192] });
  const solve = gpu.createPipeline(function () {
    return noise();
  });
  const first = await solve();
  const second = await solve();
  assert.equal(solve.executorKind, 'fused-threaded');
  let inRange = true;
  let identical = true;
  for (let i = 0; i < 8192; i++) {
    if (first[i] < 0 || first[i] >= 1 || second[i] < 0 || second[i] >= 1) inRange = false;
    if (first[i] !== second[i]) identical = false;
  }
  assert.ok(inRange, 'every draw in [0, 1)');
  assert.notOk(identical, 'an unseeded kernel reseeds per call, threaded or not');
  gpu.destroy();
});

test('a dead worker rejects the run cleanly and the next call recovers', async assert => {
  // browser budget: a silent-death stall (3s backstop), a full recovery
  // walk, and a cpu-backend reference do not fit qunit's default 10s
  assert.timeout(30000);
  const gpu = new GPU({ mode: 'webasm' });
  const cpu = new GPU({ mode: 'cpu' });
  const solve = makeJacobi(gpu, 400);
  const reference = makeJacobi(cpu, 400);
  const args = jacobiArgs(0);
  await solve.apply(null, args);
  assert.equal(solve.executorKind, 'fused-threaded');
  const pool = solve.pipeline._executor.pool;
  // browser workers die SILENTLY on terminate (no error event), so there
  // the death is only detectable as a stalled barrier -- shorten the
  // backstop so both platforms reject inside the test budget
  solve.pipeline._executor.sanityTimeoutMs = 3000;
  const doomed = solve.apply(null, args);
  // killed before the 400-step walk can finish: the barrier the survivors
  // are sitting on can never fill, and the run must reject, not hang
  pool.workers[0].handle.terminate();
  await assert.rejects(doomed, /worker|stalled/i, 'the in-flight run rejected with the worker death');
  const out = await solve.apply(null, args);
  const expected = await reference.apply(null, args);
  assertClose(assert, out, Array.from(expected), 'recovered results');
  assert.equal(solve.executorKind, 'fused-threaded', 'a fresh executor threads again');
  gpu.destroy();
  cpu.destroy();
});

test('a barrier that can never fill trips the sanity timeout, not a hang', async assert => {
  const gpu = new GPU({ mode: 'webasm' });
  const solve = makeJacobi(gpu, 16);
  const args = jacobiArgs(0);
  await solve.apply(null, args);
  assert.equal(solve.executorKind, 'fused-threaded');
  const executor = solve.pipeline._executor;
  executor.sanityTimeoutMs = 250;
  // one worker's run message silently vanishes — no death, no rejection
  // from the pool, exactly the failure the progress timeout exists for
  const worker = executor.pool._worker(executor._entry.workerCount - 1);
  const originalPost = worker.handle.postMessage.bind(worker.handle);
  worker.handle.postMessage = message => {
    if (message.type === 'pipelineRun') return;
    originalPost(message);
  };
  await assert.rejects(solve.apply(null, args), /stalled/, 'the stall rejected with the barrier diagnosis');
  const out = await solve.apply(null, args);
  assert.equal(out.length, N, 'a fresh executor and pool recovered');
  assert.equal(solve.executorKind, 'fused-threaded');
  gpu.destroy();
});

test('destroy mid-run rejects the in-flight call cleanly', async assert => {
  const gpu = new GPU({ mode: 'webasm' });
  const solve = makeJacobi(gpu, 2000);
  const args = jacobiArgs(0);
  await solve.apply(null, args);
  assert.equal(solve.executorKind, 'fused-threaded');
  const inFlight = solve.apply(null, args);
  // past the tail and into the worker walk before destroy lands
  await new Promise(resolve => setTimeout(resolve, 15));
  const destroyed = solve.destroy();
  await assert.rejects(inFlight, /destroyed/, 'the in-flight run rejected instead of finishing the plan');
  await destroyed;
  await assert.rejects(solve.apply(null, args), /destroyed/, 'later calls reject too');
  gpu.destroy();
});
