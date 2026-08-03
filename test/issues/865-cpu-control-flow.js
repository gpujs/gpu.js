const { assert, skip, test, module: describe } = require('qunit');
const { GPU } = require('../../src');

describe('issue #865');

// Three shapes where the cpu backend disagreed with plain JavaScript. Every
// expectation here is computed by running the same logic as plain JS -- cpu
// was the reference everywhere else, so these are the shapes where the
// reference itself had to be fixed. Each runs across all backends so the
// agreement is total, not pairwise.

const MODES = [
  ['cpu', true],
  ['webgl', GPU.isWebGLSupported],
  ['webgl2', GPU.isWebGL2Supported],
  ['headlessgl', GPU.isHeadlessGLSupported],
  ['webasm', GPU.isWebAssemblySupported],
];

function eachMode(name, run) {
  for (const [mode, supported] of MODES) {
    (supported ? test : skip)(`Issue #865 - ${ name } ${ mode }`, assert => run(assert, mode));
  }
}

eachMode('early return inside a loop returns that cell\'s value', (assert, mode) => {
  const reference = x => {
    for (let i = 0; i < 20; i++) {
      if (i * i > x) return i * 100 + x;
    }
    return -1;
  };
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function () {
    for (let i = 0; i < 20; i++) {
      if (i * i > this.thread.x) {
        return i * 100 + this.thread.x;
      }
    }
    return -1;
  }, { output: [6], loopMaxIterations: 30 });
  assert.deepEqual(Array.from(kernel()), [0, 1, 2, 3, 4, 5].map(reference));
  gpu.destroy();
});

eachMode('do-while continue jumps to the test', (assert, mode) => {
  const reference = (() => {
    let i = 0;
    let acc = 0;
    do {
      i++;
      if (i % 3 === 0) continue;
      acc += i;
    } while (i < 12);
    return acc;
  })();
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function () {
    let i = 0;
    let acc = 0;
    do {
      i++;
      if (i % 3 === 0) continue;
      acc += i;
    } while (i < 12);
    return acc;
  }, { output: [3], loopMaxIterations: 30 });
  assert.deepEqual(Array.from(kernel()), [reference, reference, reference]);
  gpu.destroy();
});

// GL scalar arguments are uniforms; assignment routes through a
// per-invocation shadow local there (#867) -- cpu and webasm bind per cell
eachMode('assigning to a scalar argument stays per-cell', (assert, mode) => {
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function (base) {
    base = base + this.thread.x;
    return base;
  }, { output: [4] });
  assert.deepEqual(Array.from(kernel(10)), [10, 11, 12, 13]);
  gpu.destroy();
});

test('Issue #865 - a reassigned array argument reads the new array cpu', assert => {
  // the shadow must carry reads too, not only writes
  const gpu = new GPU({ mode: 'cpu' });
  const kernel = gpu.createKernel(function (b, a) {
    a = b;
    return a[this.thread.x];
  }, { output: [3] });
  assert.deepEqual(Array.from(kernel([7, 8, 9], [1, 2, 3])), [7, 8, 9]);
  gpu.destroy();
});

test('Issue #865 - the do-while iteration cap still holds cpu', assert => {
  // the native do-while form must not lose loopMaxIterations protection
  const gpu = new GPU({ mode: 'cpu' });
  const kernel = gpu.createKernel(function () {
    let i = 0;
    do {
      i++;
    } while (true);
    return i;
  }, { output: [2], loopMaxIterations: 25 });
  const result = Array.from(kernel());
  assert.ok(result[0] <= 26, `capped near LOOP_MAX (got ${ result[0] })`);
  gpu.destroy();
});

test('Issue #865 - nested do-whiles keep separate safety counters cpu', assert => {
  const reference = (() => {
    let total = 0;
    let i = 0;
    do {
      let j = 0;
      do {
        total += 1;
        j++;
      } while (j < 3);
      i++;
    } while (i < 4);
    return total;
  })();
  const gpu = new GPU({ mode: 'cpu' });
  const kernel = gpu.createKernel(function () {
    let total = 0;
    let i = 0;
    do {
      let j = 0;
      do {
        total += 1;
        j++;
      } while (j < 3);
      i++;
    } while (i < 4);
    return total;
  }, { output: [2], loopMaxIterations: 50 });
  assert.deepEqual(Array.from(kernel()), [reference, reference]);
  gpu.destroy();
});
