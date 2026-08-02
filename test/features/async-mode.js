const { assert, skip, test, module: describe } = require('qunit');
const { GPU } = require('../../src');

describe('features: async mode');

// asyncMode makes a kernel return a Promise of its result on every backend --
// the calling contract is uniform whether the backend reads back without
// blocking (webgl2 fences, webgpu natively) or resolves its synchronous
// result (cpu, webgl, headlessgl). mode: 'async' auto-selects a backend
// under that contract and upgrades to webgpu when an adapter answers.

function contract(mode, assert) {
  const gpu = new GPU({ mode });
  const kernel = gpu
    .createKernel(function (value) {
      return this.thread.x + value[this.thread.x];
    })
    .setOutput([4])
    .setAsyncMode(true);
  const pending = kernel([10, 20, 30, 40]);
  assert.ok(pending instanceof Promise, 'call returned a Promise');
  return pending.then(result => {
    assert.deepEqual(Array.from(result), [10, 21, 32, 43]);
    gpu.destroy();
  });
}

test('asyncMode contract cpu', assert => contract('cpu', assert));

(GPU.isWebGLSupported ? test : skip)('asyncMode contract webgl', assert => contract('webgl', assert));

(GPU.isWebGL2Supported ? test : skip)('asyncMode contract webgl2', assert => contract('webgl2', assert));

(GPU.isHeadlessGLSupported ? test : skip)('asyncMode contract headlessgl', assert => contract('headlessgl', assert));

test('asyncMode as a createKernel setting', async assert => {
  const gpu = new GPU({ mode: 'cpu' });
  const kernel = gpu.createKernel(
    function () {
      return this.thread.x;
    }, {
      output: [3],
      asyncMode: true,
    }
  );
  const result = await kernel();
  assert.deepEqual(Array.from(result), [0, 1, 2]);
  gpu.destroy();
});

test('asyncMode can be turned on and back off between calls', async assert => {
  const gpu = new GPU({ mode: 'cpu' });
  const kernel = gpu
    .createKernel(function () {
      return this.thread.x * 2;
    })
    .setOutput([3]);
  const syncResult = kernel();
  assert.notOk(syncResult instanceof Promise, 'off by default');
  kernel.setAsyncMode(true);
  const asyncResult = kernel();
  assert.ok(asyncResult instanceof Promise, 'on after the setter');
  assert.deepEqual(Array.from(await asyncResult), [0, 2, 4]);
  kernel.setAsyncMode(false);
  assert.deepEqual(Array.from(kernel()), [0, 2, 4], 'and off again');
  gpu.destroy();
});

test('asyncMode rejects instead of throwing', assert => {
  const done = assert.async();
  const gpu = new GPU({ mode: 'cpu' });
  const kernel = gpu
    .createKernel(function (v) {
      return thisFunctionDoesNotExist(v[this.thread.x]);
    })
    .setOutput([1])
    .setAsyncMode(true);
  // the build fails on the unknown function, and the contract says that
  // surfaces as a rejection, never a synchronous throw
  let threw = false;
  let pending;
  try {
    pending = kernel([1]);
  } catch (e) {
    threw = true;
  }
  assert.notOk(threw, 'nothing thrown synchronously');
  pending.then(
    () => {
      assert.ok(false, 'should have rejected');
      gpu.destroy();
      done();
    },
    () => {
      assert.ok(true, 'rejected');
      gpu.destroy();
      done();
    }
  );
});

test('mode async resolves values on every platform', async assert => {
  const gpu = new GPU({ mode: 'async' });
  const kernel = gpu
    .createKernel(function (a, b) {
      let sum = 0;
      for (let i = 0; i < 16; i++) {
        sum += a[this.thread.y][i] * b[i][this.thread.x];
      }
      return sum;
    })
    .setOutput([16, 16]);
  const a = [], b = [];
  for (let y = 0; y < 16; y++) {
    a.push([]);
    b.push([]);
    for (let x = 0; x < 16; x++) {
      a[y].push(y + 1);
      b[y].push(x + 1);
    }
  }
  const result = await kernel(a, b);
  assert.equal(result.length, 16);
  assert.equal(result[0].length, 16);
  // sum over i of (y+1)(x+1) = 16 (y+1)(x+1)
  assert.equal(result[2][3], 16 * 3 * 4);
  assert.equal(result[15][15], 16 * 16 * 16);
  await gpu.destroy();
});

test('mode async upgrades to webgpu exactly when an adapter answers', async assert => {
  const gpu = new GPU({ mode: 'async' });
  const kernel = gpu
    .createKernel(function () {
      return this.thread.x + 1;
    })
    .setOutput([8]);
  const result = await kernel();
  assert.deepEqual(Array.from(result), [1, 2, 3, 4, 5, 6, 7, 8]);
  const adapterAnswered = GPU.isWebGPUSupported ? await GPU.isWebGPUAvailable() : false;
  if (adapterAnswered) {
    assert.equal(kernel.kernel.constructor.name, 'WebGPUKernel', 'upgraded');
  } else {
    assert.notEqual(kernel.kernel.constructor.name, 'WebGPUKernel', 'stayed on the proven backend');
  }
  // the contract holds across repeat calls on whatever was chosen
  const again = await kernel();
  assert.deepEqual(Array.from(again), [1, 2, 3, 4, 5, 6, 7, 8]);
  await gpu.destroy();
});

test('mode async chained setters land before the upgrade decision', async assert => {
  const gpu = new GPU({ mode: 'async' });
  const kernel = gpu
    .createKernel(function (v) {
      return v[this.thread.x] * 3;
    })
    .setOutput([2])
    .setDynamicOutput(true);
  assert.deepEqual(Array.from(await kernel([1, 2])), [3, 6]);
  kernel.setOutput([4]);
  assert.deepEqual(Array.from(await kernel([1, 2, 3, 4])), [3, 6, 9, 12]);
  await gpu.destroy();
});

test('mode async pipeline resolves a handle any downstream kernel accepts', async assert => {
  const gpu = new GPU({ mode: 'async' });
  const producer = gpu
    .createKernel(function () {
      return this.thread.x * 10;
    })
    .setOutput([4])
    .setPipeline(true);
  const consumer = gpu
    .createKernel(function (v) {
      return v[this.thread.x] + 1;
    })
    .setOutput([4]);
  const handle = await producer();
  const result = await consumer(handle);
  assert.deepEqual(Array.from(result), [1, 11, 21, 31]);
  const direct = await Promise.resolve(handle.toArray());
  assert.deepEqual(Array.from(direct), [0, 10, 20, 30]);
  await gpu.destroy();
});

// the fence-and-pack-buffer readback is webgl2's own; exercise each of its
// three transfer shapes (tight RED/FLOAT scalar, RGBA/FLOAT vector,
// RGBA/UNSIGNED_BYTE packed) against the synchronous read of the same kernel

function webgl2Compare(assert, build, args) {
  const gpuSync = new GPU({ mode: 'webgl2' });
  const gpuAsync = new GPU({ mode: 'webgl2' });
  const syncKernel = build(gpuSync);
  const asyncKernel = build(gpuAsync).setAsyncMode(true);
  const expected = syncKernel.apply(null, args);
  return asyncKernel.apply(null, args).then(actual => {
    assert.deepEqual(JSON.parse(JSON.stringify(actual)), JSON.parse(JSON.stringify(expected)));
    gpuSync.destroy();
    gpuAsync.destroy();
  });
}

(GPU.isWebGL2Supported ? test : skip)('webgl2 async readback matches sync: scalar tight read', assert => {
  return webgl2Compare(assert, gpu => gpu.createKernel(function (v) {
    return v[this.thread.x] * 2;
  }).setOutput([1024]).setPrecision('single'), [new Float32Array(1024).map((_, i) => i)]);
});

(GPU.isWebGL2Supported ? test : skip)('webgl2 async readback matches sync: 2d', assert => {
  return webgl2Compare(assert, gpu => gpu.createKernel(function () {
    return this.thread.y * 100 + this.thread.x;
  }).setOutput([33, 17]).setPrecision('single'), []);
});

(GPU.isWebGL2Supported ? test : skip)('webgl2 async readback matches sync: Array(2) rgba read', assert => {
  return webgl2Compare(assert, gpu => gpu.createKernel(function () {
    return [this.thread.x, this.thread.x * 2];
  }).setOutput([64]).setPrecision('single'), []);
});

(GPU.isWebGL2Supported ? test : skip)('webgl2 async readback matches sync: unsigned packed', assert => {
  return webgl2Compare(assert, gpu => gpu.createKernel(function (v) {
    return v[this.thread.x] + 0.25;
  }).setOutput([256]).setPrecision('unsigned'), [new Float32Array(256).map((_, i) => i)]);
});

function samplingBackend(mode) {
  return (assert) => {
    // the async contract must not change WHEN arguments are read: mutating
    // an input after the call but before the await cannot affect the result
    const gpu = new GPU({ mode });
    const kernel = gpu
      .createKernel(function (v) {
        return v[this.thread.x] * 2;
      })
      .setOutput([4])
      .setAsyncMode(true);
    const buf = new Float32Array([1, 2, 3, 4]);
    const pending = kernel(buf);
    buf[0] = 999;
    return pending.then(result => {
      assert.equal(result[0], 2, 'computed on the value held at call time');
      gpu.destroy();
    });
  };
}

test('arguments are sampled at call time cpu', assert => samplingBackend('cpu')(assert));

(GPU.isHeadlessGLSupported ? test : skip)('arguments are sampled at call time headlessgl', assert => samplingBackend('headlessgl')(assert));

(GPU.isWebGL2Supported ? test : skip)('arguments are sampled at call time webgl2', assert => samplingBackend('webgl2')(assert));

(GPU.isHeadlessGLSupported ? test : skip)('a kernel switch keeps the Promise contract', async assert => {
  // argument-signature changes rebuild the kernel through
  // onRequestSwitchKernel; the replacement must inherit asyncMode or the
  // contract silently flip-flops per signature
  const gpu = new GPU({ mode: 'headlessgl' });
  const producer = gpu.createKernel(function () {
    return this.thread.x;
  }).setOutput([4]).setPipeline(true);
  const texture = producer();
  const kernel = gpu
    .createKernel(function (v) {
      return v[this.thread.x] + 1;
    })
    .setOutput([4])
    .setAsyncMode(true)
    .setDynamicArguments(true);
  const first = kernel([1, 2, 3, 4]);
  assert.ok(first instanceof Promise, 'array call is a Promise');
  await first;
  const second = kernel(texture);
  assert.ok(second instanceof Promise, 'texture call (switched kernel) is a Promise');
  await second;
  const third = kernel([5, 6, 7, 8]);
  assert.ok(third instanceof Promise, 'switching back is a Promise');
  assert.deepEqual(Array.from(await third), [6, 7, 8, 9]);
  gpu.destroy();
});

test('combineKernels refuses the async contract with a clear error', assert => {
  const gpu = new GPU({ mode: 'async' });
  const add = gpu.createKernel(function (a, b) {
    return a[this.thread.x] + b[this.thread.x];
  }).setOutput([4]);
  const multiply = gpu.createKernel(function (a, b) {
    return a[this.thread.x] * b[this.thread.x];
  }).setOutput([4]);
  assert.throws(() => {
    gpu.combineKernels(add, multiply, function (a, b, c) {
      return multiply(add(a, b), c);
    });
  }, /mode 'async' does not yet support combineKernels/);
  return gpu.destroy();
});

test('mode async upgrades kernels that carry per-kernel functions', async assert => {
  // the upgrade harvest must read functions off the kernel instance; reading
  // the GPU instance's empty list makes the webgpu build fail and silently
  // pins the kernel to the fallback forever
  const gpu = new GPU({ mode: 'async' });
  const kernel = gpu.createKernel(function (v) {
    return twice(v[this.thread.x]);
  }, {
    output: [4],
    functions: [function twice(x) { return x * 2; }],
  });
  const result = await kernel([1, 2, 3, 4]);
  assert.deepEqual(Array.from(result), [2, 4, 6, 8]);
  const adapterAnswered = GPU.isWebGPUSupported ? await GPU.isWebGPUAvailable() : false;
  if (adapterAnswered) {
    assert.equal(kernel.kernel.constructor.name, 'WebGPUKernel', 'helper did not block the upgrade');
  } else {
    assert.ok(true, 'no adapter here; upgrade path not reachable');
  }
  await gpu.destroy();
});

test('a webgpu pipeline handle feeds a kernel that declined its upgrade', async assert => {
  // producer upgrades, consumer declines (Math.random is deferred); the
  // async contract converts the handle transparently instead of crashing on
  // an unknown KernelValue
  const gpu = new GPU({ mode: 'async' });
  const producer = gpu.createKernel(function () {
    return this.thread.x * 10;
  }).setOutput([4]).setPipeline(true);
  const consumer = gpu.createKernel(function (v) {
    return v[this.thread.x] + Math.random() * 0;
  }).setOutput([4]);
  const handle = await producer();
  const result = await consumer(handle);
  assert.deepEqual(Array.from(result), [0, 10, 20, 30]);
  await gpu.destroy();
});

(GPU.isWebGL2Supported ? test : skip)('webgl2 asyncMode leaves the main thread free between issue and resolve', async assert => {
  // a wrapped-but-blocking read resolves within the task that issued it, so
  // an already-queued macrotask could never run first; the fence path yields
  // to the event loop while the GPU works. Several heavy rounds so a fence
  // signalling instantly on some driver cannot fail the whole claim.
  const gpu = new GPU({ mode: 'webgl2' });
  const kernel = gpu
    .createKernel(function (a) {
      let sum = 0;
      for (let i = 0; i < 512; i++) {
        sum += a[i] * (this.thread.x % 7);
      }
      return sum;
    })
    .setOutput([1024 * 512])
    .setAsyncMode(true);
  const data = new Float32Array(512).fill(1);
  let firedBeforeResolve = 0;
  for (let round = 0; round < 4; round++) {
    const pending = kernel(data);
    let resolved = false;
    // queued before the poll loop's own timers, so with a blocking read the
    // resolution microtasks all beat this macrotask and it observes resolved
    const timer = new Promise(resolve => setTimeout(() => {
      if (!resolved) firedBeforeResolve++;
      resolve();
    }, 0));
    const result = await pending;
    resolved = true;
    assert.equal(result[1], 512, `round ${round} correct`);
    await timer;
  }
  assert.ok(firedBeforeResolve > 0, 'a queued macrotask ran while at least one readback was in flight');
  gpu.destroy();
});

function getPixelsContract(mode, assert) {
  // under the async contract getPixels returns a Promise on every backend,
  // so `await kernel.getPixels()` is portable to webgpu, where the readback
  // is genuinely asynchronous; without the contract it stays synchronous
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function () {
    this.color(1, 0, 0, 1);
  }, { output: [2, 2], graphical: true });
  kernel();
  const syncPixels = kernel.getPixels();
  assert.notOk(syncPixels instanceof Promise, 'sync kernel: raw bytes');
  assert.equal(syncPixels.length, 16);
  kernel.setAsyncMode(true);
  return kernel().then(() => {
    const pending = kernel.getPixels();
    assert.ok(pending instanceof Promise, 'async contract: a Promise');
    return pending.then(pixels => {
      assert.deepEqual(Array.from(pixels.slice(0, 4)), [255, 0, 0, 255]);
      gpu.destroy();
    });
  });
}

(GPU.isCanvasSupported ? test : skip)('getPixels follows the async contract cpu', assert => getPixelsContract('cpu', assert));

(GPU.isHeadlessGLSupported ? test : skip)('getPixels follows the async contract headlessgl', assert => getPixelsContract('headlessgl', assert));

(GPU.isWebGL2Supported ? test : skip)('getPixels follows the async contract webgl2', assert => getPixelsContract('webgl2', assert));
