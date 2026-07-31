const { assert, skip, test, module: describe } = require('qunit');
const { GPU } = require('../../src');

describe('issue #858');

// The cpu backend renamed identifiers by spelling alone, so a kernel local
// sharing a constant's name became `constants_n` in its own declarator:
// `const n = this.constants.n` emitted `const constants_n = constants_n`,
// which throws in the temporal dead zone. The GL backends were unaffected,
// so a kernel could pass in GPU mode and break in cpu mode.

const MODES = [
  ['cpu', true],
  ['webgl', GPU.isWebGLSupported],
  ['webgl2', GPU.isWebGL2Supported],
  ['headlessgl', GPU.isHeadlessGLSupported],
];

function eachMode(name, run) {
  for (const [mode, supported] of MODES) {
    (supported ? test : skip)(`Issue #858 - ${ name } ${ mode }`, assert => run(assert, mode));
  }
}

eachMode('a local shadowing a constant', (assert, mode) => {
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function (data) {
    const n = this.constants.n;
    return data[this.thread.x] * n;
  }, { output: [4], constants: { n: 3 } });
  assert.deepEqual(Array.from(kernel([1, 2, 3, 4])), [3, 6, 9, 12]);
  gpu.destroy();
});

// A local as the loop bound is the shape the issue cites, but GLSL ES 1.00
// requires a loop's bound to be a constant expression, so webgl cannot
// compile it whatever the local is called -- naming it `m` instead of `n`
// fails identically. That is a platform limit, not this bug, so the loop
// case runs everywhere else.
for (const [mode, supported] of MODES.filter(([m]) => m !== 'webgl')) {
  (supported ? test : skip)(`Issue #858 - a shadowing local as a loop bound ${ mode }`, assert => {
    const gpu = new GPU({ mode });
    const kernel = gpu.createKernel(function (data) {
      const n = this.constants.n;
      let sum = 0;
      for (let i = 0; i < n; i++) {
        sum += data[i];
      }
      return sum;
    }, { output: [4], constants: { n: 3 } });
    assert.deepEqual(Array.from(kernel([1, 2, 3, 4])), [6, 6, 6, 6]);
    gpu.destroy();
  });
}

eachMode('a shadowing local drives a constant-bounded loop', (assert, mode) => {
  // the same shadowing, in a loop every backend can compile
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function (data) {
    const n = this.constants.n;
    let sum = 0;
    for (let i = 0; i < this.constants.n; i++) {
      sum += data[i] * n;
    }
    return sum;
  }, { output: [4], constants: { n: 3 } });
  assert.deepEqual(Array.from(kernel([1, 2, 3, 4])), [18, 18, 18, 18]);
  gpu.destroy();
});

eachMode('a shadowing local that is reassigned', (assert, mode) => {
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function (data) {
    let n = this.constants.n;
    n = n + 1;
    return data[this.thread.x] * n;
  }, { output: [4], constants: { n: 3 } });
  assert.deepEqual(Array.from(kernel([1, 2, 3, 4])), [4, 8, 12, 16]);
  gpu.destroy();
});

eachMode('the constant is still readable where nothing shadows it', (assert, mode) => {
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function (data) {
    return data[this.thread.x] * this.constants.n;
  }, { output: [4], constants: { n: 3 } });
  assert.deepEqual(Array.from(kernel([1, 2, 3, 4])), [3, 6, 9, 12]);
  gpu.destroy();
});

eachMode('a non-shadowing local keeps working', (assert, mode) => {
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function (data) {
    const scale = this.constants.n;
    return data[this.thread.x] * scale;
  }, { output: [4], constants: { n: 3 } });
  assert.deepEqual(Array.from(kernel([1, 2, 3, 4])), [3, 6, 9, 12]);
  gpu.destroy();
});
