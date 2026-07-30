const { assert, skip, test, module: describe } = require('qunit');
const { GPU, input } = require('../../src');

describe('features: argument type changes');

// A kernel is compiled for the argument types it first saw. Reusing the
// instance with a fundamentally different type must produce the same answer
// as a kernel that only ever saw those types -- the library switches to a
// kernel compiled for them. Before this was handled centrally the GL
// backends could return the PREVIOUS call's values, silently.

const MODES = [
  ['cpu', true],
  ['webgl', GPU.isWebGLSupported],
  ['webgl2', GPU.isWebGL2Supported],
  ['headlessgl', GPU.isHeadlessGLSupported],
];

function eachMode(name, run) {
  for (const [mode, supported] of MODES) {
    (supported ? test : skip)(`${ name } ${ mode }`, assert => run(assert, mode));
  }
}

function doubler(gpu) {
  return gpu.createKernel(function (a) {
    return a[this.thread.x] * 2;
  }).setOutput([2]);
}

eachMode('an Input after an Array reads the Input', (assert, mode) => {
  const gpu = new GPU({ mode });
  const kernel = doubler(gpu);
  assert.deepEqual(Array.from(kernel([1, 2])), [2, 4], 'the array call');
  const result = kernel(input(new Float32Array([7, 8]), [2]));
  assert.deepEqual(Array.from(result), [14, 16], 'the Input call, not the array call again');
  gpu.destroy();
});

eachMode('an Array after an Input reads the Array', (assert, mode) => {
  const gpu = new GPU({ mode });
  const kernel = doubler(gpu);
  assert.deepEqual(Array.from(kernel(input(new Float32Array([1, 2]), [2]))), [2, 4], 'the Input call');
  assert.deepEqual(Array.from(kernel([7, 8])), [14, 16], 'the array call');
  gpu.destroy();
});

eachMode('alternating types stay correct across many calls', (assert, mode) => {
  // the switched-to kernels are cached by signature, so this also covers
  // reactivating a kernel rather than building a fresh one every time
  const gpu = new GPU({ mode });
  const kernel = doubler(gpu);
  for (let i = 1; i <= 3; i++) {
    assert.deepEqual(Array.from(kernel([i, i])), [i * 2, i * 2], `array round ${ i }`);
    assert.deepEqual(
      Array.from(kernel(input(new Float32Array([i * 10, i * 10]), [2]))),
      [i * 20, i * 20],
      `Input round ${ i }`);
  }
  gpu.destroy();
});

eachMode('a number after an array does not read the array', (assert, mode) => {
  // the kernel body only makes sense for one of the two, so this asserts the
  // failure mode: a clear error or a value derived from the number -- never
  // the previous call's result
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function (a) {
    return a[this.thread.x] * 2;
  }).setOutput([2]);
  assert.deepEqual(Array.from(kernel([3, 3])), [6, 6], 'the array call');
  let result = null;
  try {
    result = kernel(5);
  } catch (e) {
    assert.ok(true, `refused with an error: ${ e.message.split('\n')[0].slice(0, 60) }`);
    gpu.destroy();
    return;
  }
  assert.notDeepEqual(Array.from(result), [6, 6], 'did not silently repeat the array call');
  gpu.destroy();
});

(GPU.isHeadlessGLSupported ? test : skip)('a pipeline texture after an array reads the texture', assert => {
  const gpu = new GPU({ mode: 'headlessgl' });
  const producer = gpu.createKernel(function () {
    return (this.thread.x + 1) * 100;
  }).setOutput([2]).setPipeline(true);
  const kernel = doubler(gpu);
  assert.deepEqual(Array.from(kernel([1, 2])), [2, 4], 'the array call');
  const result = kernel(producer());
  assert.deepEqual(Array.from(result), [200, 400], 'the texture call');
  gpu.destroy();
});

test('asyncMode keeps the contract across an argument type change', async assert => {
  const gpu = new GPU({ mode: 'cpu' });
  const kernel = doubler(gpu).setAsyncMode(true);
  assert.deepEqual(Array.from(await kernel([1, 2])), [2, 4]);
  const pending = kernel(input(new Float32Array([7, 8]), [2]));
  assert.ok(pending instanceof Promise, 'still a Promise after the switch');
  assert.deepEqual(Array.from(await pending), [14, 16]);
  gpu.destroy();
});
