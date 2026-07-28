const { assert, skip, test, module: describe } = require('qunit');
const { GPU } = require('../../src');

describe('internal: hoisted index reads');

// The FXC workaround (#300) hoists a texture read used inside an index
// expression into a temporary ahead of the statement. Statements that mix the
// pattern with side effects are first linearized -- each side effect lifted
// into its own statement in evaluation order, guarded side effects unfolded
// into ifs, if-conditions lifted into declarations -- so the hoist applies to
// them without ever reordering an observable effect. Only loop headers are
// left as written.

function check(assert, kernelFunction, args, expected, expectHoist) {
  const gpu = new GPU({ mode: 'headlessgl' });
  const kernel = gpu.createKernel(kernelFunction).setOutput([1]);
  assert.equal(kernel.apply(null, args)[0], expected);
  assert.equal(
    /hoisted_/.test(kernel.kernel.translatedSource),
    expectHoist,
    expectHoist ? 'read was hoisted' : 'read stayed inline'
  );
  gpu.destroy();
}

(GPU.isHeadlessGLSupported ? test : skip)('a plain nested read hoists', (t) => {
  check(t, function (input, lookup) {
    return lookup[input[this.thread.x]];
  }, [[2], [7, 13, 19, 23]], 19, true);
});

(GPU.isHeadlessGLSupported ? test : skip)('a side effect before the read keeps original order', (t) => {
  // i++ executes before the read in source order; a read hoisted without
  // linearizing would run first and see the old i, returning 13
  check(t, function (input, lookup) {
    let i = this.thread.x + 1;
    const value = i++ * 0.0 + lookup[input[i]];
    return value;
  }, [[9, 1, 2, 3], [7, 13, 19, 23]], 19, true);
});

(GPU.isHeadlessGLSupported ? test : skip)('an update expression inside the index keeps its value', (t) => {
  check(t, function (input, lookup) {
    let i = this.thread.x;
    const value = lookup[input[i++]] + i;
    return value;
  }, [[2], [7, 13, 19, 23]], 20, true);
});

(GPU.isHeadlessGLSupported ? test : skip)('a comma sequence keeps its order', (t) => {
  check(t, function (input, lookup) {
    let i = this.thread.x;
    const value = (i += 2, lookup[input[i]]);
    return value;
  }, [[9, 1, 2, 3], [7, 13, 19, 23]], 19, true);
});

(GPU.isHeadlessGLSupported ? test : skip)('a guarded side effect stays guarded: branch not taken', (t) => {
  // the untaken ternary branch contains i++; it must not run
  check(t, function (flag, input, lookup) {
    let i = this.thread.x;
    const value = flag > 0.0 ? lookup[input[i++]] : -1.0;
    return value + i * 100.0;
  }, [-1, [2], [7, 13, 19, 23]], -1, true);
});

(GPU.isHeadlessGLSupported ? test : skip)('a guarded side effect stays guarded: branch taken', (t) => {
  check(t, function (flag, input, lookup) {
    let i = this.thread.x;
    const value = flag > 0.0 ? lookup[input[i++]] : -1.0;
    return value + i * 100.0;
  }, [1, [2], [7, 13, 19, 23]], 119, true);
});

(GPU.isHeadlessGLSupported ? test : skip)('a short-circuited side effect in an if never runs', (t) => {
  check(t, function (flag, input, lookup) {
    let i = this.thread.x;
    let hit = 0.0;
    if (flag > 0.0 && lookup[input[i++]] > 0.0) {
      hit = 1.0;
    }
    return hit * 1000.0 + i;
  }, [-1, [2], [7, 13, 19, 23]], 0, true);
});

(GPU.isHeadlessGLSupported ? test : skip)('a short-circuited side effect in an if runs when reached', (t) => {
  check(t, function (flag, input, lookup) {
    let i = this.thread.x;
    let hit = 0.0;
    if (flag > 0.0 && lookup[input[i++]] > 0.0) {
      hit = 1.0;
    }
    return hit * 1000.0 + i;
  }, [1, [2], [7, 13, 19, 23]], 1001, true);
});

(GPU.isHeadlessGLSupported ? test : skip)('a pure read in an if condition hoists', (t) => {
  check(t, function (input, lookup) {
    let out = -1.0;
    if (lookup[input[this.thread.x]] > 18.0) {
      out = 5.0;
    }
    return out;
  }, [[2], [7, 13, 19, 23]], 5, true);
});
