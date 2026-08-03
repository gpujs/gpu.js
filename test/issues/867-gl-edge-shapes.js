const { assert, skip, test, module: describe } = require('qunit');
const { GPU } = require('../../src');

describe('issue #867 edge shapes');

// Shapes the pre-merge adversarial review of #866 proved wrong or crashing
// after the first #867 fix: the do-while rotation and the argument shadow
// locals must hold under switch lowerings, unbraced bodies, and every scalar
// argument type. Expectations are plain-JS computed, agreement is total.

const MODES = [
  ['cpu', true],
  ['webgl', GPU.isWebGLSupported],
  ['webgl2', GPU.isWebGL2Supported],
  ['headlessgl', GPU.isHeadlessGLSupported],
  ['webasm', GPU.isWebAssemblySupported],
];

function eachMode(name, run) {
  for (const [mode, supported] of MODES) {
    (supported ? test : skip)(`Issue #867 - ${ name } ${ mode }`, assert => run(assert, mode));
  }
}

eachMode('do-while continue inside a switch case matches JavaScript', (assert, mode) => {
  // the continue-rewrite approach injected a break the switch lowering
  // rejected, and the error path itself crashed on the synthetic node; the
  // rotated loop needs no body rewriting at all
  const reference = (() => {
    let i = 0;
    let acc = 0;
    do {
      i += 1;
      switch (i) {
        case 2:
          continue;
      }
      acc += 100;
    } while (i < 2);
    return acc;
  })();
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function () {
    let i = 0;
    let acc = 0;
    do {
      i += 1;
      switch (i) {
        case 2:
          continue;
      }
      acc += 100;
    } while (i < 2);
    return acc;
  }, { output: [2], loopMaxIterations: 30 });
  assert.deepEqual(Array.from(kernel()), [reference, reference]);
  gpu.destroy();
});

eachMode('unbraced do-while as an if consequent honors continue', (assert, mode) => {
  // the body-rewrite ran only for do-whiles sitting directly in a block, so
  // an unbraced branch position silently kept the skipped-exit-test bug
  const reference = (n => {
    let acc = 0;
    let j = 0;
    if (n > 0) do {
      j++;
      if (j >= 3) continue;
      acc += j;
    } while (j < 3);
    return acc + j;
  })(1);
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function (n) {
    let acc = 0;
    let j = 0;
    if (n > 0) do {
      j++;
      if (j >= 3) continue;
      acc += j;
    } while (j < 3);
    return acc + j;
  }, { output: [2], loopMaxIterations: 30 });
  assert.deepEqual(Array.from(kernel(1)), [reference, reference]);
  gpu.destroy();
});

eachMode('assigning to a Boolean argument stays per-cell', (assert, mode) => {
  // the bool(...) uniform wrap must not apply to the shadow local -- on the
  // assignment's left side it is not even an lvalue
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function (flag) {
    if (this.thread.x > 0) {
      flag = false;
    }
    return flag ? 1 : 0;
  }, { output: [4] });
  assert.deepEqual(Array.from(kernel(true)), [1, 0, 0, 0]);
  gpu.destroy();
});

eachMode('assigning a literal to an Integer argument compiles and computes', (assert, mode) => {
  // the shadow local is declared int; a float-printed literal on the right
  // side was a GLSL compile error
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function (n) {
    n += 1;
    return n;
  }, { output: [3], argumentTypes: { n: 'Integer' } });
  assert.deepEqual(Array.from(kernel(10)), [11, 11, 11]);
  gpu.destroy();
});

eachMode('var redeclaration of an argument is one binding, like JavaScript', (assert, mode) => {
  // `var x` redeclaring a parameter must not get a per-cell shadow on top of
  // the local the declaration already emits -- that split one JS binding
  // into two variables
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function (x) {
    var x = 5;
    x += 1;
    return x;
  }, { output: [2] });
  assert.deepEqual(Array.from(kernel(40)), [6, 6]);
  gpu.destroy();
});
