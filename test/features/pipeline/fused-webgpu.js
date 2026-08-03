const { assert, skip, test, module: describe } = require('qunit');
const { GPU, input } = require('../../../src');

describe('features: pipeline fused webgpu encoder');

// The fused-encoder executor records every plan step as a compute pass into
// ONE command encoder over persistent storage buffers; each scenario here
// asserts executorKind === 'fused-encoder' so a silent fall back to the
// generic executor fails the suite, and results are checked against the same
// pipeline forced onto the cpu backend.

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

function webgpuTest(name, body) {
  (GPU.isWebGPUSupported ? test : skip)(name, async assert => {
    if (!(await webgpuAdapter(assert))) return;
    return body(assert);
  });
}

/**
 * Builds the same kernels + pipeline on webgpu and on cpu, runs both with
 * the same arguments, asserts the webgpu one compiled the fused encoder and
 * answers match the cpu reference.
 */
async function fusedVsCpu(assert, makePipeline, argsList, compare) {
  const webgpu = new GPU({ mode: 'webgpu' });
  const cpu = new GPU({ mode: 'cpu' });
  const fusedPipeline = makePipeline(webgpu);
  const referencePipeline = makePipeline(cpu);
  for (let i = 0; i < argsList.length; i++) {
    const fused = await fusedPipeline.apply(null, argsList[i]);
    const reference = await referencePipeline.apply(null, argsList[i]);
    compare(fused, reference, `call ${ i }`);
  }
  assert.equal(fusedPipeline.executorKind, 'fused-encoder', 'webgpu compiled the fused encoder');
  assert.equal(fusedPipeline.fallbackReason, null, 'no fallback reason while fused');
  assert.equal(referencePipeline.executorKind, 'generic', 'cpu stays generic');
  await webgpu.destroy();
  cpu.destroy();
}

webgpuTest('jacobi ping-pong: one kernel, two static bind groups, args re-sampled per call', async assert => {
  await fusedVsCpu(assert, gpu => {
    const sweep = gpu.createKernel(function (u, q) {
      let left = this.thread.x - 1;
      if (left < 0) left = 0;
      let right = this.thread.x + 1;
      if (right > 7) right = 7;
      return 0.25 * (u[left] + u[right]) + q[this.thread.x];
    }, { output: [8] });
    return gpu.createPipeline(function (u, q) {
      for (let s = 0; s < this.constants.sweeps; s++) {
        u = sweep(u, q);
      }
      return u;
    }, { constants: { sweeps: 7 } });
  }, [
    [[0, 1, 2, 3, 4, 5, 6, 7], [1, 0.5, 1, 0.5, 1, 0.5, 1, 0.5]],
    // second call: different values through the SAME compiled layout
    [[7, 6, 5, 4, 3, 2, 1, 0], [0.5, 1, 0.5, 1, 0.5, 1, 0.5, 1]],
  ], (fused, reference, label) => assertClose(assert, fused, Array.from(reference), label));
});

webgpuTest('multi-kernel chain with double-buffer liveness (step 3 reads step 1)', async assert => {
  await fusedVsCpu(assert, gpu => {
    const inc = gpu.createKernel(function (u) {
      return u[this.thread.x] + 1;
    }, { output: [4] });
    const dbl = gpu.createKernel(function (u) {
      return u[this.thread.x] * 2;
    }, { output: [4] });
    const mix = gpu.createKernel(function (a, b) {
      return a[this.thread.x] * 100 + b[this.thread.x];
    }, { output: [4] });
    return gpu.createPipeline(function (u) {
      const a = inc(u);
      const b = dbl(a);
      return mix(b, a);
    });
  }, [
    [[1, 2, 3, 4]],
    [[5, 0, -3, 2.5]],
  ], (fused, reference, label) => assertClose(assert, fused, Array.from(reference), label));
});

webgpuTest('object and array returns, pipeline arg reused by several steps', async assert => {
  await fusedVsCpu(assert, gpu => {
    const add = gpu.createKernel(function (a, b) {
      return a[this.thread.x] + b[this.thread.x];
    }, { output: [4] });
    const dbl = gpu.createKernel(function (a) {
      return a[this.thread.x] * 2;
    }, { output: [4] });
    return gpu.createPipeline(function (u, q) {
      const a = add(u, q);
      const b = add(a, q);
      return { sum: add(b, q), doubledU: dbl(u), doubledQ: dbl(q) };
    });
  }, [
    [[1, 2, 3, 4], [10, 10, 10, 10]],
  ], (fused, reference, label) => {
    assertClose(assert, fused.sum, Array.from(reference.sum), `${ label } sum`);
    assertClose(assert, fused.doubledU, Array.from(reference.doubledU), `${ label } doubled u`);
    assertClose(assert, fused.doubledQ, Array.from(reference.doubledQ), `${ label } doubled q`);
  });
});

webgpuTest('literal scalars, captured arrays, and buffer constants', async assert => {
  const captured = [10, 20, 30, 40];
  await fusedVsCpu(assert, gpu => {
    const scale = gpu.createKernel(function (a, k) {
      return a[this.thread.x] * k + this.constants.bias[this.thread.x];
    }, { output: [4], constants: { bias: [1, 2, 3, 4] } });
    const offset = gpu.createKernel(function (a, o) {
      return a[this.thread.x] + o[this.thread.x];
    }, { output: [4] });
    return gpu.createPipeline(function (x) {
      return offset(scale(x, 3), captured);
    });
  }, [
    [[1, 2, 3, 4]],
    [[0, -1, 5, 0.5]],
  ], (fused, reference, label) => assertClose(assert, fused, Array.from(reference), label));
});

webgpuTest('2d output through the ping-pong loop', async assert => {
  await fusedVsCpu(assert, gpu => {
    const blur = gpu.createKernel(function (m) {
      let left = this.thread.x - 1;
      if (left < 0) left = 0;
      return (m[this.thread.y][left] + m[this.thread.y][this.thread.x]) / 2 + 1;
    }, { output: [7, 3] });
    return gpu.createPipeline(function (m) {
      for (let i = 0; i < this.constants.passes; i++) {
        m = blur(m);
      }
      return m;
    }, { constants: { passes: 4 } });
  }, [
    [[
      [0, 1, 2, 3, 4, 5, 6],
      [10, 11, 12, 13, 14, 15, 16],
      [20, 21, 22, 23, 24, 25, 26],
    ]],
  ], (fused, reference, label) => {
    assert.equal(fused.length, 3, `${ label }: 2d shape`);
    for (let y = 0; y < 3; y++) {
      assertClose(assert, fused[y], Array.from(reference[y]), `${ label } row ${ y }`);
    }
  });
});

webgpuTest('scalar pipeline args ride the per-call params write', async assert => {
  await fusedVsCpu(assert, gpu => {
    const step = gpu.createKernel(function (a, k, flip) {
      if (flip) {
        return a[this.thread.x] - k;
      }
      return a[this.thread.x] + k;
    }, { output: [4] });
    return gpu.createPipeline(function (x, k, flip) {
      return step(step(x, k, flip), k, flip);
    });
  }, [
    [[1, 2, 3, 4], 2.5, false],
    [[1, 2, 3, 4], 2.5, true],
    [[1, 2, 3, 4], -1.5, true],
  ], (fused, reference, label) => assertClose(assert, fused, Array.from(reference), label));
});

webgpuTest('Input pipeline argument fuses and samples at call time', async assert => {
  const { input } = require('../../../src');
  await fusedVsCpu(assert, gpu => {
    const grow = gpu.createKernel(function (m) {
      return m[this.thread.y][this.thread.x] + 1;
    }, { output: [3, 2] });
    return gpu.createPipeline(function (m) {
      return grow(grow(m));
    });
  }, [
    [input(new Float32Array([0, 1, 2, 10, 11, 12]), [3, 2])],
  ], (fused, reference, label) => {
    for (let y = 0; y < 2; y++) {
      assertClose(assert, fused[y], Array.from(reference[y]), `${ label } row ${ y }`);
    }
  });
  // Input contents must sample at the call, exactly like plain arrays
  const gpu = new GPU({ mode: 'webgpu' });
  const dbl = gpu.createKernel(function (a) {
    return a[this.thread.x] * 2;
  }, { output: [3] });
  const solve = gpu.createPipeline(function (x) {
    return dbl(x);
  });
  const backing = new Float32Array([1, 2, 3]);
  const pending = solve(input(backing, [3]));
  backing[0] = 100;
  assertClose(assert, await pending, [2, 4, 6], 'mutation after the call does not leak in');
  await gpu.destroy();
});

webgpuTest('two identical steps keep distinct output buffers', async assert => {
  // same program, same input buffer, same baked scalars — only the output
  // buffer distinguishes the two passes, so a pass-record collision here
  // leaves the second step's plan buffer unwritten
  await fusedVsCpu(assert, gpu => {
    const inc = gpu.createKernel(function (u) {
      return u[this.thread.x] + 1;
    }, { output: [4] });
    const mix = gpu.createKernel(function (a, b) {
      return a[this.thread.x] * 100 + b[this.thread.x];
    }, { output: [4] });
    return gpu.createPipeline(function (x) {
      const a = inc(x);
      const b = inc(x);
      return mix(a, b);
    });
  }, [
    [[1, 2, 3, 4]],
  ], (fused, reference, label) => assertClose(assert, fused, Array.from(reference), label));
});

webgpuTest('seeded Math.random reproduces the direct-call streams exactly', async assert => {
  const gpu = new GPU({ mode: 'webgpu' });
  const settings = { output: [8], randomSeed: 1234 };
  const jitter = gpu.createKernel(function (a) {
    return a[this.thread.x] + Math.random();
  }, settings);
  const solve = gpu.createPipeline(function (x) {
    return jitter(jitter(x));
  });
  const x = [1, 2, 3, 4, 5, 6, 7, 8];
  // the pinned seed makes every run's stream identical, so two direct calls
  // compose to exactly what the fused two-step plan must produce
  const directOnce = await jitter(x);
  const directTwice = await jitter(Array.from(directOnce));
  const fused = await solve(x);
  assert.equal(solve.executorKind, 'fused-encoder');
  assertClose(assert, fused, Array.from(directTwice), 'seeded pipeline vs composed direct calls');
  const again = await solve(x);
  assertClose(assert, again, Array.from(fused), 'seeded pipeline repeats bit-for-bit');
  await gpu.destroy();
});

webgpuTest('unpinned Math.random draws a fresh seed per call', async assert => {
  const gpu = new GPU({ mode: 'webgpu' });
  const jitter = gpu.createKernel(function (a) {
    return a[this.thread.x] + Math.random();
  }, { output: [8] });
  const solve = gpu.createPipeline(function (x) {
    return jitter(x);
  });
  const x = [0, 0, 0, 0, 0, 0, 0, 0];
  const first = await solve(x);
  const second = await solve(x);
  assert.equal(solve.executorKind, 'fused-encoder');
  let differs = false;
  for (let i = 0; i < first.length; i++) {
    if (first[i] !== second[i]) differs = true;
  }
  assert.ok(differs, 'two calls draw different streams');
  await gpu.destroy();
});

webgpuTest('argument size change recompiles the fused plan and stays fused', async assert => {
  const gpu = new GPU({ mode: 'webgpu' });
  const total = gpu.createKernel(function (a, n) {
    let sum = 0;
    for (let i = 0; i < n; i++) {
      sum += a[i];
    }
    return sum + this.thread.x;
  }, { output: [4], dynamicArguments: true, loopMaxIterations: 64 });
  const solve = gpu.createPipeline(function (x, n) {
    return total(x, n);
  });
  const first = await solve([1, 2, 3, 4], 4);
  assert.equal(solve.executorKind, 'fused-encoder');
  assertClose(assert, first, [10, 11, 12, 13], 'first size');
  const second = await solve([1, 2, 3, 4, 5, 6], 6);
  assert.equal(solve.executorKind, 'fused-encoder', 'still fused after a size change');
  assert.equal(solve.fallbackReason, null);
  assertClose(assert, second, [21, 22, 23, 24], 'second size');
  const third = await solve([2, 2, 2, 2], 4);
  assertClose(assert, third, [8, 9, 10, 11], 'back to the first size');
  await gpu.destroy();
});

webgpuTest('degradation: a buffer-handle pipeline argument falls back with a reason', async assert => {
  const gpu = new GPU({ mode: 'webgpu' });
  const producer = gpu.createKernel(function (a) {
    return a[this.thread.x] * 10;
  }, { output: [4], pipeline: true });
  const addOne = gpu.createKernel(function (t) {
    return t[this.thread.x] + 1;
  }, { output: [4] });
  const solve = gpu.createPipeline(function (t) {
    return addOne(addOne(t));
  });
  const handle = await producer([1, 2, 3, 4]);
  const result = await solve(handle);
  assert.equal(solve.executorKind, 'generic', 'fell back to the generic executor');
  assert.ok(/GPU-resident handle/.test(solve.fallbackReason), `reason names the cause: ${ solve.fallbackReason }`);
  assertClose(assert, result, [12, 22, 32, 42], 'generic executor still answers correctly');
  await gpu.destroy();
});

webgpuTest('concurrent fused calls serialize and answer from their own arguments', async assert => {
  const gpu = new GPU({ mode: 'webgpu' });
  const dbl = gpu.createKernel(function (a) {
    return a[this.thread.x] * 2;
  }, { output: [3] });
  const solve = gpu.createPipeline(function (x) {
    return dbl(dbl(x));
  });
  const buf = [1, 2, 3];
  const firstCall = solve(buf);
  buf[0] = 100; // sampled at call time; must not leak into the first call
  const secondCall = solve(buf);
  const [first, second] = await Promise.all([firstCall, secondCall]);
  assertClose(assert, first, [4, 8, 12], 'first call');
  assertClose(assert, second, [400, 8, 12], 'second call');
  assert.equal(solve.executorKind, 'fused-encoder');
  await gpu.destroy();
});

webgpuTest('destroy releases the executor GPU buffers and later calls reject', async assert => {
  const gpu = new GPU({ mode: 'webgpu' });
  const sweep = gpu.createKernel(function (u, q) {
    return u[this.thread.x] * 0.5 + q[this.thread.x];
  }, { output: [8] });
  const solve = gpu.createPipeline(function (u, q) {
    for (let s = 0; s < this.constants.sweeps; s++) {
      u = sweep(u, q);
    }
    return u;
  }, { constants: { sweeps: 4 } });
  await solve([1, 2, 3, 4, 5, 6, 7, 8], [1, 1, 1, 1, 1, 1, 1, 1]);
  assert.equal(solve.executorKind, 'fused-encoder');
  // 2 plan buffers (ping-pong) + 2 argument regions + 2 params uniforms +
  // 1 staging = 7 executor buffers, plus the released clone-kernel build
  const originalDestroy = GPUBuffer.prototype.destroy;
  let destroyed = 0;
  GPUBuffer.prototype.destroy = function () {
    destroyed++;
    return originalDestroy.apply(this, arguments);
  };
  try {
    await solve.destroy();
  } finally {
    GPUBuffer.prototype.destroy = originalDestroy;
  }
  assert.ok(destroyed >= 7, `destroy released the executor's buffers (${ destroyed } GPUBuffer.destroy calls)`);
  await assert.rejects(solve([1, 1, 1, 1, 1, 1, 1, 1], [0, 0, 0, 0, 0, 0, 0, 0]), /destroyed/, 'calls after destroy reject');
  await gpu.destroy();
});

webgpuTest('gpu.destroy() reaches a fused pipeline first; destroying it again is safe', async assert => {
  const gpu = new GPU({ mode: 'webgpu' });
  const dbl = gpu.createKernel(function (a) {
    return a[this.thread.x] * 2;
  }, { output: [3] });
  const solve = gpu.createPipeline(function (x) {
    return dbl(dbl(x));
  });
  assertClose(assert, await solve([1, 2, 3]), [4, 8, 12], 'runs before teardown');
  assert.equal(solve.executorKind, 'fused-encoder');
  await gpu.destroy();
  await solve.destroy();
  assert.ok(true, 'destroy after gpu.destroy() does not throw');
});

webgpuTest('user kernels stay independently usable while their pipeline is fused', async assert => {
  const gpu = new GPU({ mode: 'webgpu' });
  const dbl = gpu.createKernel(function (a) {
    return a[this.thread.x] * 2;
  }, { output: [3] });
  const solve = gpu.createPipeline(function (x) {
    return dbl(dbl(x));
  });
  assertClose(assert, await solve([1, 2, 3]), [4, 8, 12], 'pipeline');
  assert.equal(solve.executorKind, 'fused-encoder');
  assertClose(assert, await dbl([5, 6, 7]), [10, 12, 14], 'direct call unaffected');
  assertClose(assert, await solve([2, 2, 2]), [8, 8, 8], 'pipeline again after direct use');
  await gpu.destroy();
});

webgpuTest('a handle bound only in the results degrades with a named reason', async assert => {
  if (!(await webgpuAdapter(assert))) return;
  const gpu = new GPU({ mode: 'webgpu' });
  const k = gpu.createKernel(function (a) { return a[this.thread.x] * 2; }, { output: [4] });
  const p = gpu.createPipeline(function (x, y) { return { out: k(x), copy: y }; });
  const first = await p([1, 2, 3, 4], [9, 8, 7, 6]);
  assert.equal(p.executorKind, 'fused-encoder');
  assert.deepEqual(Array.from(first.copy), [9, 8, 7, 6]);
  const producer = gpu.createKernel(function () { return this.thread.x + 10; }, { output: [4], pipeline: true });
  const handle = await producer();
  // the result-only seat never gets an arg region, so without its own
  // screen the fused path resolved a deleted buffer handle here
  const second = await p([1, 2, 3, 4], handle);
  assert.equal(p.executorKind, 'generic');
  assert.ok(/GPU-resident handle/.test(p.fallbackReason), p.fallbackReason);
  const copy = typeof second.copy.toArray === 'function' ? await second.copy.toArray() : second.copy;
  assert.deepEqual(Array.from(copy), [10, 11, 12, 13]);
  await gpu.destroy();
});

webgpuTest('an Input returned as a result resolves to plain rows, generic-parity', async assert => {
  if (!(await webgpuAdapter(assert))) return;
  const gpu = new GPU({ mode: 'webgpu' });
  const g = gpu.createKernel(function (m) { return m[this.thread.y][this.thread.x] + 1; }, { output: [3, 2] });
  const p = gpu.createPipeline(function (m) { return { orig: m, out: g(m) }; });
  const res = await p(input(new Float32Array([0, 1, 2, 10, 11, 12]), [3, 2]));
  assert.equal(p.executorKind, 'fused-encoder');
  assert.deepEqual(Array.from(res.orig[0]), [0, 1, 2], 'the Input erected to rows, not the instance');
  assert.deepEqual(Array.from(res.orig[1]), [10, 11, 12]);
  assert.deepEqual(Array.from(res.out[1]), [11, 12, 13]);
  await gpu.destroy();
});
