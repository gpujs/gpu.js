const { assert, test, module: describe } = require('qunit');
const { GPU } = require('../../../src');

describe('features: webasm pipeline');

// pipeline is accepted the way the cpu backend accepts it (#868): there is
// no device memory to pipeline into, so the result is the plain typed array
// the run already produces -- a fresh copy per call, valid as input to any
// downstream kernel. Before #868 these kernels silently degraded to cpu,
// which cost 17 of 30 workloads on the gpu.rocks suite their backend.

test('a pipelined kernel stays on webasm', () => {
  const gpu = new GPU({ mode: 'webasm' });
  const kernel = gpu.createKernel(function (a) {
    return a[this.thread.x] + 1;
  }, { output: [4], pipeline: true });
  const result = kernel([1, 2, 3, 4]);
  assert.deepEqual(Array.from(result), [2, 3, 4, 5]);
  assert.equal(kernel.kernel.constructor.name, 'WebAssemblyKernel', 'not degraded to cpu');
  gpu.destroy();
});

test('pipelined output feeds a downstream webasm kernel', () => {
  const gpu = new GPU({ mode: 'webasm' });
  const first = gpu.createKernel(function (a) {
    return a[this.thread.x] * 2;
  }, { output: [4], pipeline: true });
  const second = gpu.createKernel(function (v) {
    return v[this.thread.x] + 100;
  }, { output: [4], pipeline: true });
  const result = second(first([1, 2, 3, 4]));
  assert.deepEqual(Array.from(result), [102, 104, 106, 108]);
  assert.equal(first.kernel.constructor.name, 'WebAssemblyKernel');
  assert.equal(second.kernel.constructor.name, 'WebAssemblyKernel');
  gpu.destroy();
});

test('ping-pong through the same pipelined kernel iterates correctly', () => {
  // the multi-pass shape pipelining exists for: feed a kernel its own
  // output. Arguments copy into wasm memory before the run and the output
  // copies out after, so self-feeding cannot alias mid-run.
  const gpu = new GPU({ mode: 'webasm' });
  const step = gpu.createKernel(function (v) {
    return v[this.thread.x] * 2 + 1;
  }, { output: [4], pipeline: true });
  let state = [0, 1, 2, 3];
  let expected = state.slice();
  for (let i = 0; i < 5; i++) {
    state = step(state);
    expected = expected.map(x => x * 2 + 1);
  }
  assert.deepEqual(Array.from(state), expected);
  assert.equal(step.kernel.constructor.name, 'WebAssemblyKernel');
  gpu.destroy();
});

test('each pipelined call returns a fresh array, immutable or not', () => {
  // no reuse surprises: the readback slice is a new copy per call, so an
  // earlier result is not clobbered by a later run (the cpu backend's
  // mutable-reuse optimization does clobber; webasm's contract is stricter
  // and that is fine -- callers holding old results keep them)
  const gpu = new GPU({ mode: 'webasm' });
  const kernel = gpu.createKernel(function (a) {
    return a[this.thread.x] + 1;
  }, { output: [3], pipeline: true });
  const first = kernel([1, 2, 3]);
  const second = kernel([10, 20, 30]);
  assert.deepEqual(Array.from(first), [2, 3, 4], 'first result survives the second run');
  assert.deepEqual(Array.from(second), [11, 21, 31]);
  gpu.destroy();
});
