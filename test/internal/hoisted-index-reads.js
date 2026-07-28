const { assert, skip, test, module: describe } = require('qunit');
const { GPU } = require('../../src');

describe('internal: hoisted index reads');

// The FXC workaround (#300) hoists a texture read used inside an index
// expression into a temporary ahead of the statement. That is only
// unobservable while nothing else in the statement has side effects, so the
// compiler skips the hoist for statements that mix the pattern with update
// expressions, comma sequences or inner assignments — those keep the nested
// form and its original evaluation order.

function makeKernel(gpu, source) {
  return gpu.createKernel(source).setOutput([1]);
}

(GPU.isHeadlessGLSupported ? test : skip)('a plain nested read hoists', () => {
  const gpu = new GPU({ mode: 'headlessgl' });
  const kernel = makeKernel(gpu, function (input, lookup) {
    return lookup[input[this.thread.x]];
  });
  assert.equal(kernel([2], [7, 13, 19, 23])[0], 19);
  assert.ok(/hoisted_/.test(kernel.kernel.translatedSource), 'nested read was hoisted');
  gpu.destroy();
});

(GPU.isHeadlessGLSupported ? test : skip)('a side effect before the read keeps original order', () => {
  const gpu = new GPU({ mode: 'headlessgl' });
  // i++ executes before the read in source order; a hoisted read would run
  // first and see the old i, returning lookup[input[1]] = 13 instead of 19
  const kernel = makeKernel(gpu, function (input, lookup) {
    let i = this.thread.x + 1;
    const value = i++ * 0.0 + lookup[input[i]];
    return value;
  });
  assert.equal(kernel([9, 1, 2, 3], [7, 13, 19, 23])[0], 19);
  assert.notOk(/hoisted_/.test(kernel.kernel.translatedSource), 'no hoist alongside a side effect');
  gpu.destroy();
});

(GPU.isHeadlessGLSupported ? test : skip)('an update expression after the read keeps its value', () => {
  const gpu = new GPU({ mode: 'headlessgl' });
  const kernel = makeKernel(gpu, function (input, lookup) {
    let i = this.thread.x;
    const value = lookup[input[i++]] + i;
    return value;
  });
  assert.equal(kernel([2], [7, 13, 19, 23])[0], 20);
  gpu.destroy();
});

(GPU.isHeadlessGLSupported ? test : skip)('a pure read still hoists past a ternary guard', () => {
  const gpu = new GPU({ mode: 'headlessgl' });
  const kernel = makeKernel(gpu, function (flag, input, lookup) {
    return flag > 0 ? lookup[input[this.thread.x]] : -1;
  });
  assert.equal(kernel(1, [2], [7, 13, 19, 23])[0], 19);
  assert.equal(kernel(-1, [2], [7, 13, 19, 23])[0], -1);
  gpu.destroy();
});
