const { assert, test, module: describe } = require('qunit');
const { GPU } = require('../../../src');

describe('features: pipeline trace rules');

// Trace rules are backend-independent: the orchestration function runs and
// fails before any kernel executes, so cpu mode proves them for every
// backend. The build happens at the FIRST CALL, so violations surface as a
// rejection of that call's promise -- the async contract -- never as a
// synchronous throw from createPipeline.

function makeGPU() {
  const gpu = new GPU({ mode: 'cpu' });
  const sweep = gpu.createKernel(function (u) {
    return u[this.thread.x] + 1;
  }, { output: [4] });
  return { gpu, sweep };
}

test('createPipeline does not run the orchestration function', assert => {
  assert.expect(1);
  const { gpu } = makeGPU();
  let ran = false;
  gpu.createPipeline(function (u) {
    ran = true;
    return u;
  });
  assert.equal(ran, false, 'trace deferred to the first call');
  gpu.destroy();
});

test('reading an element of a handle throws at build', async assert => {
  const { gpu, sweep } = makeGPU();
  const solve = gpu.createPipeline(function (u) {
    const v = sweep(u);
    return v[0];
  });
  await assert.rejects(solve([1, 2, 3, 4]), /pipeline intermediate results cannot be read during orchestration/);
  gpu.destroy();
});

test('reading a property of a handle throws at build', async assert => {
  const { gpu, sweep } = makeGPU();
  const solve = gpu.createPipeline(function (u) {
    const v = sweep(u);
    return v.length;
  });
  await assert.rejects(solve([1, 2, 3, 4]), /pipeline intermediate results cannot be read during orchestration/);
  gpu.destroy();
});

test('using a handle in arithmetic throws at build', async assert => {
  const { gpu, sweep } = makeGPU();
  const solve = gpu.createPipeline(function (u) {
    const v = sweep(u);
    return sweep(v * 2);
  });
  await assert.rejects(solve([1, 2, 3, 4]), /cannot be used in arithmetic or conditions during orchestration/);
  gpu.destroy();
});

test('using a handle in a condition throws at build', async assert => {
  const { gpu, sweep } = makeGPU();
  const solve = gpu.createPipeline(function (u) {
    const v = sweep(u);
    if (v > 0) {
      return sweep(v);
    }
    return v;
  });
  await assert.rejects(solve([1, 2, 3, 4]), /cannot be used in arithmetic or conditions during orchestration/);
  gpu.destroy();
});

test('Math.random during orchestration throws at build, and is restored after', async assert => {
  const { gpu, sweep } = makeGPU();
  const solve = gpu.createPipeline(function (u) {
    if (Math.random() > 0.5) {
      return sweep(u);
    }
    return sweep(sweep(u));
  });
  await assert.rejects(solve([1, 2, 3, 4]), /Math\.random\(\) is not allowed during pipeline orchestration/);
  const draw = Math.random();
  assert.ok(draw >= 0 && draw < 1, 'Math.random restored after the failed trace');
  gpu.destroy();
});

test('calling a kernel from another GPU instance throws at build', async assert => {
  const { gpu } = makeGPU();
  const other = new GPU({ mode: 'cpu' });
  const foreign = other.createKernel(function (u) {
    return u[this.thread.x] * 2;
  }, { output: [4] });
  const solve = gpu.createPipeline(function (u) {
    return foreign(u);
  });
  await assert.rejects(solve([1, 2, 3, 4]), /pipelines can only call kernels created by the same GPU instance/);
  gpu.destroy();
  other.destroy();
});

test('graphical kernels inside a pipeline throw at build', async assert => {
  const { gpu } = makeGPU();
  const draw = gpu.createKernel(function () {
    this.color(1, 0, 0, 1);
  }, { output: [2, 2], graphical: true });
  const solve = gpu.createPipeline(function (u) {
    draw(u);
    return u;
  });
  await assert.rejects(solve([1, 2, 3, 4]), /graphical kernels are not supported inside pipelines/);
  gpu.destroy();
});

test('kernel maps inside a pipeline throw at build', async assert => {
  const { gpu } = makeGPU();
  const mapped = gpu.createKernelMap({
    squared: function square(v) {
      return v * v;
    },
  }, function (u) {
    return square(u[this.thread.x]);
  }, { output: [4] });
  const solve = gpu.createPipeline(function (u) {
    return mapped(u);
  });
  await assert.rejects(solve([1, 2, 3, 4]), /kernel maps are not supported inside pipelines/);
  gpu.destroy();
});

test('a handle escaping into a non-kernel function still throws when consumed', async assert => {
  // best effort per the contract: the escape is caught the moment the
  // foreign function touches the handle, not at the call boundary
  const { gpu, sweep } = makeGPU();
  function norm(values) {
    return Math.abs(values[0]);
  }
  const solve = gpu.createPipeline(function (u) {
    const v = sweep(u);
    norm(v);
    return v;
  });
  await assert.rejects(solve([1, 2, 3, 4]), /pipeline intermediate results cannot be read during orchestration/);
  gpu.destroy();
});

test('returning nothing throws at build', async assert => {
  const { gpu, sweep } = makeGPU();
  const solve = gpu.createPipeline(function (u) {
    sweep(u);
  });
  await assert.rejects(solve([1, 2, 3, 4]), /must return a handle, or an Array or plain object of handles/);
  gpu.destroy();
});

test('kernels without a fixed output throw at build', async assert => {
  const { gpu } = makeGPU();
  const sized = gpu.createKernel(function (u) {
    return u[this.thread.x];
  });
  const solve = gpu.createPipeline(function (u) {
    return sized(u);
  });
  await assert.rejects(solve([1, 2, 3, 4]), /kernels called inside a pipeline must have a fixed output size/);
  gpu.destroy();
});
