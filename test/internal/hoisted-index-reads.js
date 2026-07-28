const { assert, skip, test, module: describe } = require('qunit');
const { GPU } = require('../../src');

describe('internal: hoisted index reads');

// The FXC workaround (#300) hoists a texture read used inside an index
// expression into a temporary ahead of the statement. Statements that mix the
// pattern with side effects are first linearized -- each side effect lifted
// into its own statement in evaluation order, guarded side effects unfolded
// into ifs, if-conditions lifted into declarations -- so the hoist applies to
// them without ever reordering an observable effect. Loops whose headers
// contain the pattern are restructured the way ANGLE's SimplifyLoopConditions
// does it -- condition checked at the top of the body, update at its end,
// with continue statements gaining a copy of whatever they would jump to --
// so per-iteration timing survives there too.

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

(GPU.isHeadlessGLSupported ? test : skip)('a read in a for init hoists', (t) => {
  check(t, function (input, lookup) {
    let acc = 0.0;
    for (let i = lookup[input[this.thread.x]]; i < 21.0; i++) {
      acc += 1.0;
    }
    return acc;
  }, [[2], [7, 13, 19, 23]], 2, true);
});

(GPU.isHeadlessGLSupported ? test : skip)('a read in a for test re-evaluates per iteration', (t) => {
  check(t, function (input, lookup) {
    let acc = 0.0;
    for (let i = 0; lookup[input[i]] > 10.0; i++) {
      acc += 1.0;
    }
    return acc;
  }, [[2, 2, 0], [7, 13, 19]], 2, true);
});

(GPU.isHeadlessGLSupported ? test : skip)('a read in a for update runs after continue too', (t) => {
  check(t, function (input, lookup) {
    let acc = 0.0;
    for (let i = 0.0; i < 3.0; i += lookup[input[i]]) {
      if (i == 1.0) continue;
      acc += 10.0;
    }
    return acc;
  }, [[0, 0, 0], [1, 5, 9]], 20, true);
});

(GPU.isHeadlessGLSupported ? test : skip)('a read in a while test re-evaluates per iteration', (t) => {
  check(t, function (input, lookup) {
    let i = 0;
    let acc = 0.0;
    while (lookup[input[i]] > 10.0) {
      acc += 1.0;
      i++;
    }
    return acc;
  }, [[2, 2, 0], [7, 13, 19]], 2, true);
});

(GPU.isHeadlessGLSupported ? test : skip)('a read in a do-while test survives continue', (t) => {
  check(t, function (input, lookup) {
    let i = 0;
    let acc = 0.0;
    do {
      i++;
      if (i == 2) continue;
      acc += 100.0;
    } while (lookup[input[i]] > 10.0);
    return acc * 10.0 + i;
  }, [[9, 2, 2, 0], [7, 13, 19, 23]], 2003, true);
});

(GPU.isHeadlessGLSupported ? test : skip)('a do-while continue evaluates the test and can exit', (t) => {
  // the condition is false at the moment continue runs, so the loop must
  // exit right there: acc stays 100, i stays 2. Skipping the check would
  // run one more iteration and produce 2003.
  check(t, function (input, lookup) {
    let i = 0;
    let acc = 0.0;
    do {
      i++;
      if (i == 2) continue;
      acc += 100.0;
    } while (lookup[input[i]] > 10.0);
    return acc * 10.0 + i;
  }, [[9, 2, 0, 0], [7, 13, 19, 23]], 1002, true);
});

(GPU.isHeadlessGLSupported ? test : skip)('a switch discriminant containing the pattern hoists', (t) => {
  check(t, function (input, lookup) {
    let out = -1.0;
    switch (lookup[input[this.thread.x]]) {
      case 19:
        out = 5.0;
        break;
      default:
        out = 1.0;
    }
    return out;
  }, [[2], [7, 13, 19, 23]], 5, true);
});

// The ANGLE-side review of the upstream workaround surfaced two shapes this
// compiler also mishandled: a user function taking an array compiles to a
// sampler-taking GLSL function, so calling it nested inside itself is the
// same FXC shape as a nested texture read; and a pure comma inside a kept
// ternary branch survived linearization and silently lost the hoist.

function makeGpuWithPick() {
  const gpu = new GPU({ mode: 'headlessgl' });
  gpu.addFunction(function pick(arr, i) { return arr[i]; }, {
    argumentTypes: { arr: 'Array', i: 'Number' },
    returnType: 'Number',
  });
  return gpu;
}

(GPU.isHeadlessGLSupported ? test : skip)('a user function called nested inside itself lifts', (t) => {
  const gpu = makeGpuWithPick();
  const kernel = gpu.createKernel(function (input, lookup) {
    return pick(lookup, pick(input, this.thread.x));
  }).setOutput([1]);
  t.equal(kernel([2], [7, 13, 19, 23])[0], 19);
  t.notOk(
    /pick\([^;\n]*pick\(/.test(kernel.kernel.translatedSource),
    'no call to pick nested inside another on one statement'
  );
  gpu.destroy();
});

(GPU.isHeadlessGLSupported ? test : skip)('a nested self-call in an if condition lifts', (t) => {
  const gpu = makeGpuWithPick();
  const kernel = gpu.createKernel(function (input, lookup) {
    let out = -1.0;
    if (pick(lookup, pick(input, this.thread.x)) > 18.0) {
      out = 5.0;
    }
    return out;
  }).setOutput([1]);
  t.equal(kernel([2], [7, 13, 19, 23])[0], 5);
  t.notOk(
    /pick\([^;\n]*pick\(/.test(kernel.kernel.translatedSource),
    'no call to pick nested inside another on one statement'
  );
  gpu.destroy();
});

(GPU.isHeadlessGLSupported ? test : skip)('a nested self-call keeps order around side effects', (t) => {
  const gpu = makeGpuWithPick();
  const kernel = gpu.createKernel(function (input, lookup) {
    let i = this.thread.x;
    const value = pick(lookup, pick(input, i++)) + i;
    return value;
  }).setOutput([1]);
  t.equal(kernel([2], [7, 13, 19, 23])[0], 20);
  t.notOk(
    /pick\([^;\n]*pick\(/.test(kernel.kernel.translatedSource),
    'no call to pick nested inside another on one statement'
  );
  gpu.destroy();
});

(GPU.isHeadlessGLSupported ? test : skip)('a pure comma inside a kept ternary still hoists', (t) => {
  check(t, function (flag, input, lookup) {
    const value = flag > 0.0 ? (0.0, lookup[input[this.thread.x]]) : -1.0;
    return value;
  }, [1, [2], [7, 13, 19, 23]], 19, true);
});
