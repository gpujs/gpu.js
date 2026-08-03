const { assert, test, module: describe } = require('qunit');
const { GPU } = require('../../../src');
const { utils } = require('../../../src');

describe('features: pipeline fused webasm executor');

// The fused executor compiles every plan step over ONE shared wasm memory;
// each scenario here asserts executorKind === 'fused-sync' so a silent fall
// back to the generic executor fails the suite, and results are checked
// against the same pipeline forced onto the cpu backend.

function assertClose(assert, actual, expected, label) {
  const values = Array.from(actual);
  assert.equal(values.length, expected.length, `${ label }: length`);
  for (let i = 0; i < values.length; i++) {
    const delta = Math.abs(values[i] - expected[i]);
    const scale = Math.max(Math.abs(expected[i]), 1);
    assert.ok(delta / scale <= 1e-5, `${ label } cell ${ i }: ${ values[i] } vs ${ expected[i] }`);
  }
}

/**
 * Builds the same kernels + pipeline on webasm and on cpu, runs both with
 * the same arguments, asserts the webasm one fused and answers match the
 * cpu reference.
 */
async function fusedVsCpu(assert, makePipeline, argsList, compare) {
  const webasm = new GPU({ mode: 'webasm' });
  const cpu = new GPU({ mode: 'cpu' });
  const fusedPipeline = makePipeline(webasm);
  const referencePipeline = makePipeline(cpu);
  for (let i = 0; i < argsList.length; i++) {
    const fused = await fusedPipeline.apply(null, argsList[i]);
    const reference = await referencePipeline.apply(null, argsList[i]);
    compare(fused, reference, `call ${ i }`);
  }
  assert.equal(fusedPipeline.executorKind, 'fused-sync', 'webasm compiled the fused executor');
  assert.equal(fusedPipeline.fallbackReason, null, 'no fallback reason while fused');
  assert.equal(referencePipeline.executorKind, 'generic', 'cpu stays generic');
  webasm.destroy();
  cpu.destroy();
}

test('jacobi ping-pong: one kernel, two module instances, args re-sampled per call', async assert => {
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

test('multi-kernel chain with double-buffer liveness (step 3 reads step 1)', async assert => {
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

test('object and array returns, pipeline arg reused by several steps', async assert => {
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

test('literal scalars, captured arrays, and constants upload once', async assert => {
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

test('2d output with a non-multiple-of-4 row width (scalar epilogue path)', async assert => {
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

test('scalar pipeline args: float, boolean, and strict-integer slots', async assert => {
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
    // boolean slot receiving a number: type drift, recompiles and stays fused
    [[1, 2, 3, 4], 2.5, 1],
  ], (fused, reference, label) => assertClose(assert, fused, Array.from(reference), label));
});

test('Input pipeline argument', async assert => {
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
});

test('Array(2)-returning step as a final result stays fused', async assert => {
  await fusedVsCpu(assert, gpu => {
    const inc = gpu.createKernel(function (a) {
      return a[this.thread.x] + 1;
    }, { output: [4] });
    const toVec = gpu.createKernel(function (a) {
      return [a[this.thread.x], a[this.thread.x] * 2];
    }, { output: [4] });
    return gpu.createPipeline(function (x) {
      return toVec(inc(x));
    });
  }, [
    [[1, 2, 3, 4]],
  ], (fused, reference, label) => {
    for (let i = 0; i < 4; i++) {
      assertClose(assert, fused[i], Array.from(reference[i]), `${ label } vec ${ i }`);
    }
  });
});

test('argument size change recompiles the fused plan and stays fused', async assert => {
  const gpu = new GPU({ mode: 'webasm' });
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
  assert.equal(solve.executorKind, 'fused-sync');
  assertClose(assert, first, [10, 11, 12, 13], 'first size');
  const second = await solve([1, 2, 3, 4, 5, 6], 6);
  assert.equal(solve.executorKind, 'fused-sync', 'still fused after a size change');
  assert.equal(solve.fallbackReason, null);
  assertClose(assert, second, [21, 22, 23, 24], 'second size');
  const third = await solve([2, 2, 2, 2], 4);
  assertClose(assert, third, [8, 9, 10, 11], 'back to the first size');
  gpu.destroy();
});

test('strict-integer scalar followed by a float flows through one fused layout', async assert => {
  // setupArguments maps inferred Integer to Number, so the slot is an f32
  // either way; this pins that an integer-first call does not bake a layout
  // a float call cannot use
  const gpu = new GPU({ mode: 'webasm' });
  const mul = gpu.createKernel(function (a, k) {
    return a[this.thread.x] * k;
  }, { output: [4], strictIntegers: true });
  const solve = gpu.createPipeline(function (x, k) {
    return mul(mul(x, k), k);
  });
  assertClose(assert, await solve([1, 2, 3, 4], 3), [9, 18, 27, 36], 'integer k');
  assert.equal(solve.executorKind, 'fused-sync');
  assertClose(assert, await solve([1, 2, 3, 4], 0.5), [0.25, 0.5, 0.75, 1], 'float k');
  assert.equal(solve.executorKind, 'fused-sync', 'still fused with the float value');
  gpu.destroy();
});

test('intermediates never leave wasm memory: one flattenTo per array argument per call', async assert => {
  const gpu = new GPU({ mode: 'webasm' });
  const sweep = gpu.createKernel(function (u, q) {
    return u[this.thread.x] * 0.5 + q[this.thread.x];
  }, { output: [16] });
  const solve = gpu.createPipeline(function (u, q) {
    for (let s = 0; s < this.constants.sweeps; s++) {
      u = sweep(u, q);
    }
    return u;
  }, { constants: { sweeps: 32 } });
  const u0 = new Float32Array(16).fill(1);
  const q = new Float32Array(16).fill(0.25);
  await solve(u0, q);
  assert.equal(solve.executorKind, 'fused-sync');

  // count uploads on a warm call: the 32 steps must not add any
  const original = utils.flattenTo;
  let flattens = 0;
  utils.flattenTo = function () {
    flattens++;
    return original.apply(utils, arguments);
  };
  try {
    await solve(u0, q);
  } finally {
    utils.flattenTo = original;
  }
  assert.equal(flattens, 2, 'exactly one upload per pipeline array argument, none per step');
  gpu.destroy();
});

test('degradation: an argument type the webasm backend cannot take falls back with a reason', async assert => {
  const gpu = new GPU({ mode: 'webasm' });
  const flat = new Float32Array([5, 6, 7, 8]);
  // quacks like a texture: webasm kernels degrade to cpu for it, and the
  // pipeline's fused compile must decline for the same reason
  const fakeTexture = {
    type: 'NumberTexture',
    toArray: () => Array.from(flat),
    delete: () => {},
  };
  const addOne = gpu.createKernel(function (t) {
    return t[this.thread.x] + 1;
  }, { output: [4] });
  const solve = gpu.createPipeline(function (t) {
    return addOne(addOne(t));
  });
  const result = await solve(fakeTexture);
  assert.equal(solve.executorKind, 'generic', 'fell back to the generic executor');
  assert.ok(/not supported on the webasm backend/.test(solve.fallbackReason), `reason names the cause: ${ solve.fallbackReason }`);
  assertClose(assert, result, [7, 8, 9, 10], 'generic executor still answers correctly');
  gpu.destroy();
});

test('degradation: Array(2) intermediate names its reason', async assert => {
  const gpu = new GPU({ mode: 'webasm' });
  const toVec = gpu.createKernel(function (a) {
    return [a[this.thread.x], a[this.thread.x] * 2];
  }, { output: [4] });
  const useVec = gpu.createKernel(function (v) {
    return v[this.thread.x][0] + v[this.thread.x][1];
  }, { output: [4] });
  const solve = gpu.createPipeline(function (x) {
    return useVec(toVec(x));
  });
  // the webasm KERNELS cannot take the vec intermediate either (no self-typed
  // values on this backend), so the call itself fails downstream; the
  // pipeline-level contract under test is the named fused decline
  await solve([1, 2, 3, 4]).then(
    () => assert.ok(true, 'generic executor absorbed the plan'),
    () => assert.ok(true, 'plan is not runnable on this backend at all')
  );
  assert.equal(solve.executorKind, 'generic');
  assert.ok(/cannot feed another step/.test(solve.fallbackReason), `reason: ${ solve.fallbackReason }`);
  gpu.destroy();
});

test('setConstants re-traces and the new plan fuses again', async assert => {
  const gpu = new GPU({ mode: 'webasm' });
  const inc = gpu.createKernel(function (a) {
    return a[this.thread.x] + 1;
  }, { output: [3] });
  const solve = gpu.createPipeline(function (x) {
    for (let i = 0; i < this.constants.n; i++) {
      x = inc(x);
    }
    return x;
  }, { constants: { n: 2 } });
  assertClose(assert, await solve([0, 0, 0]), [2, 2, 2], 'n=2');
  assert.equal(solve.executorKind, 'fused-sync');
  solve.setConstants({ n: 5 });
  assertClose(assert, await solve([0, 0, 0]), [5, 5, 5], 'n=5 after re-trace');
  assert.equal(solve.executorKind, 'fused-sync', 'the re-traced plan fused too');
  gpu.destroy();
});

test('concurrent fused calls serialize and answer from their own arguments', async assert => {
  const gpu = new GPU({ mode: 'webasm' });
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
  gpu.destroy();
});

test('destroy releases every fused instance, including extra type signatures', async assert => {
  const gpu = new GPU({ mode: 'webasm' });
  const before = gpu.kernels.length;
  const shift = gpu.createKernel(function (a, s) {
    return a[this.thread.x] + s;
  }, { output: [3], strictIntegers: true });
  // integer and float scalar signatures force a second program instance for
  // the same kernel
  const solve = gpu.createPipeline(function (x) {
    return shift(shift(x, 1), 1.5);
  });
  assertClose(assert, await solve([1, 2, 3]), [3.5, 4.5, 5.5], 'two signatures');
  assert.equal(solve.executorKind, 'fused-sync');
  assert.ok(gpu.kernels.length > before + 1, 'fused compile registered private instances');
  await solve.destroy();
  assert.equal(gpu.kernels.length, before + 1, 'only the user kernel remains');
  await assert.rejects(solve([1, 2, 3]), /destroyed/, 'calls after destroy reject');
  gpu.destroy();
});

test('user kernels stay independently usable while their pipeline is fused', async assert => {
  const gpu = new GPU({ mode: 'webasm' });
  const dbl = gpu.createKernel(function (a) {
    return a[this.thread.x] * 2;
  }, { output: [3] });
  const solve = gpu.createPipeline(function (x) {
    return dbl(dbl(x));
  });
  assertClose(assert, await solve([1, 2, 3]), [4, 8, 12], 'pipeline');
  assert.equal(solve.executorKind, 'fused-sync');
  assertClose(assert, dbl([5, 6, 7]), [10, 12, 14], 'direct call unaffected');
  assertClose(assert, await solve([2, 2, 2]), [8, 8, 8], 'pipeline again after direct use');
  gpu.destroy();
});
