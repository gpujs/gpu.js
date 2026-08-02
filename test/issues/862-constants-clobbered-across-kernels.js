const { assert, skip, test, module: describe } = require('qunit');
const { GPU, input } = require('../../src');

describe('issue #862');

// Texture units are context state shared by every kernel on a GPU instance,
// but each kernel numbers its own units from zero. Arguments re-upload every
// run; array constants were bound once at setup, so another kernel's
// arguments landed on their units and every later read silently returned the
// other kernel's data. Constants now rebind per run.

const MODES = [
  ['webgl', GPU.isWebGLSupported],
  ['webgl2', GPU.isWebGL2Supported],
  ['headlessgl', GPU.isHeadlessGLSupported],
  ['cpu', true],
];

function eachMode(name, run) {
  for (const [mode, supported] of MODES) {
    (supported ? test : skip)(`Issue #862 - ${ name } ${ mode }`, assert => run(assert, mode));
  }
}

eachMode('an array constant survives another kernel\'s arguments', (assert, mode) => {
  const gpu = new GPU({ mode });
  const consumer = gpu.createKernel(function (x) {
    return x[this.thread.x];
  }).setOutput([4]);
  const holder = gpu.createKernel(function () {
    return this.constants.table[this.thread.x];
  }).setConstants({ table: [10, 20, 30, 40] }).setOutput([4]);

  consumer(new Float32Array([1, 2, 3, 4]));
  assert.deepEqual(Array.from(holder()), [10, 20, 30, 40], 'first call');
  consumer(new Float32Array([5, 6, 7, 8]));
  assert.deepEqual(Array.from(holder()), [10, 20, 30, 40], 'after the other kernel ran again');
  gpu.destroy();
});

eachMode('two constants survive two arguments, interleaved', (assert, mode) => {
  // the FFT shape from the report: twiddle-table constants on the same units
  // as a two-argument kernel
  const gpu = new GPU({ mode });
  const stage = gpu.createKernel(function () {
    return this.constants.tw1[this.thread.x] + this.constants.tw2[this.thread.x] * 100;
  }).setConstants({ tw1: [1, 2, 3, 4], tw2: [5, 6, 7, 8] }).setOutput([4]);
  const bitrev = gpu.createKernel(function (re, im) {
    return re[this.thread.x] + im[this.thread.x];
  }).setOutput([4]);

  const expected = [501, 602, 703, 804];
  for (let round = 0; round < 4; round++) {
    const re = new Float32Array([round, round, round, round]);
    assert.deepEqual(Array.from(bitrev(re, re)), [round * 2, round * 2, round * 2, round * 2], `bitrev round ${ round }`);
    assert.deepEqual(Array.from(stage()), expected, `stage round ${ round }`);
  }
  gpu.destroy();
});

eachMode('an Input constant survives too', (assert, mode) => {
  const gpu = new GPU({ mode });
  const consumer = gpu.createKernel(function (x) {
    return x[this.thread.x];
  }).setOutput([4]);
  const holder = gpu.createKernel(function () {
    return this.constants.t[this.thread.x];
  }).setConstants({ t: input(new Float32Array([9, 8, 7, 6]), [4]) }).setOutput([4]);

  consumer(new Float32Array([1, 1, 1, 1]));
  holder();
  consumer(new Float32Array([2, 2, 2, 2]));
  assert.deepEqual(Array.from(holder()), [9, 8, 7, 6]);
  gpu.destroy();
});

eachMode('arguments still update freely alongside rebound constants', (assert, mode) => {
  // guard against over-fixing: the rebind must not pin stale argument data
  const gpu = new GPU({ mode });
  const holder = gpu.createKernel(function (x) {
    return x[this.thread.x] + this.constants.table[this.thread.x];
  }).setConstants({ table: [10, 20, 30, 40] }).setOutput([4]);
  assert.deepEqual(Array.from(holder(new Float32Array([1, 2, 3, 4]))), [11, 22, 33, 44]);
  assert.deepEqual(Array.from(holder(new Float32Array([5, 6, 7, 8]))), [15, 26, 37, 48]);
  gpu.destroy();
});
