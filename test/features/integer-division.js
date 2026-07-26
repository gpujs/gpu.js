const { assert, skip, test, module: describe } = require('qunit');
const { GPU } = require('../../src');

describe('feature: integer division');

// JavaScript has no integer division: `a / b` is always fractional. getType()
// used to report `/` as the left operand's type unless fixIntegerDivisionAccuracy
// was set, so GLSL emitted an integer divide and truncated. `this.thread.x / 64`
// returned 0 for every thread, and `this.color(this.thread.x / 64, ...)` did not
// even compile ('color' : no matching overloaded function found).
//
// The flag is derived from GPU features, so identical code produced different
// images on different hardware. Both states are pinned here rather than relying
// on whatever the host reports.
function testThreadDivision(mode, fixIntegerDivisionAccuracy) {
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function () {
    return this.thread.x / 64;
  }, { output: [4], fixIntegerDivisionAccuracy });
  const result = Array.from(kernel());
  [0, 1 / 64, 2 / 64, 3 / 64].forEach((expected, i) => {
    assert.ok(Math.abs(result[i] - expected) < 0.001, `index ${i}: expected ${expected}, got ${result[i]}`);
  });
  gpu.destroy();
}

function testLiteralDivision(mode, fixIntegerDivisionAccuracy) {
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function () {
    return 7 / 2;
  }, { output: [1], fixIntegerDivisionAccuracy });
  assert.ok(Math.abs(kernel()[0] - 3.5) < 0.001, `expected 3.5, got ${kernel()[0]}`);
  gpu.destroy();
}

// Math.floor(a / b) is how JS asks for truncation, and must keep working.
function testFlooredDivision(mode, fixIntegerDivisionAccuracy) {
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function (a, b) {
    return Math.floor(a[this.thread.x] / b[this.thread.x]);
  }, { output: [4], fixIntegerDivisionAccuracy });
  assert.deepEqual(Array.from(kernel([7, 9, 10, 100], [2, 4, 3, 7])), [3, 2, 3, 14]);
  gpu.destroy();
}

// the same, used where an Integer is required
function testDivisionAsIndex(mode, fixIntegerDivisionAccuracy) {
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function (a, b, t) {
    return t[Math.floor(a[this.thread.x] / b[this.thread.x])];
  }, { output: [4], fixIntegerDivisionAccuracy });
  const table = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120, 130, 140, 150];
  assert.deepEqual(Array.from(kernel([7, 9, 10, 100], [2, 4, 3, 7], table)), [30, 20, 30, 140]);
  gpu.destroy();
}

// the graphical form that was rendering wrong: color() takes floats, and an
// Integer-typed argument found no matching overload
function testGraphicalDivision(mode, fixIntegerDivisionAccuracy) {
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function () {
    this.color(this.thread.x / 4, 0, 0, 1);
  }, { output: [4, 4], graphical: true, fixIntegerDivisionAccuracy });
  kernel();
  const pixels = kernel.getPixels();
  // red channel should climb across the row rather than staying at 0
  const reds = [pixels[0], pixels[4], pixels[8], pixels[12]];
  assert.ok(reds[3] > reds[0], `expected a gradient across x, got ${JSON.stringify(reds)}`);
  gpu.destroy();
}

const scenarios = {
  'thread division': testThreadDivision,
  'literal division': testLiteralDivision,
  'floored division': testFlooredDivision,
  'division as index': testDivisionAsIndex,
  'graphical division': testGraphicalDivision,
};

const modes = {
  auto: undefined,
  gpu: 'gpu',
  webgl: 'webgl',
  webgl2: 'webgl2',
  headlessgl: 'headlessgl',
  cpu: 'cpu',
};

const supported = {
  auto: GPU.isGPUSupported,
  gpu: GPU.isGPUSupported,
  webgl: GPU.isWebGLSupported,
  webgl2: GPU.isWebGL2Supported,
  headlessgl: GPU.isHeadlessGLSupported,
  cpu: true,
};

Object.keys(scenarios).forEach(scenario => {
  Object.keys(modes).forEach(modeName => {
    [false, true].forEach(fix => {
      // graphical mode needs a canvas, which cpu mode has no source for on node
      const canRun = supported[modeName] &&
        !(scenario === 'graphical division' && modeName === 'cpu' && !GPU.isCanvasSupported);
      const run = canRun ? test : skip;
      run(`${scenario} ${modeName} fixIntegerDivisionAccuracy=${fix}`, () => {
        scenarios[scenario](modes[modeName], fix);
      });
    });
  });
});
