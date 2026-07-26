const { assert, skip, test, module: describe } = require('qunit');
const { GPU } = require('../../src');

describe('feature: bitwise NOT coverage');

// The existing bitwise NOT tests only feed it whole numbers 0-9, all positive,
// and never apply it twice. Every case outside that window was wrong on the GPU
// while cpu mode was correct:
//
//   ~(-1)   gave -2   (JS: 0)
//   ~~3.5   gave -5   (JS: 3)
//
// The GLSL emulation builds its result bit by bit and relies on 32-bit overflow
// wrapping to land on the negative answer, which only holds for a non-negative
// input. Given a negative one it effectively computed ~|a|, so `~~x` came out
// as ~|~x| rather than x.
function forEachValue(mode, precision, values, expected, label) {
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function (v1) {
    return ~v1[this.thread.x];
  }, { output: [values.length], precision });
  const result = Array.from(kernel(values));
  values.forEach((value, i) => {
    assert.equal(result[i], expected[i], `${label}: ~${value} expected ${expected[i]}, got ${result[i]}`);
  });
  gpu.destroy();
}

function testNegative(mode, precision) {
  // unsigned precision cannot carry negative outputs, so only the inputs are
  // negative here and every expected result is >= 0
  const values = [-1, -2, -5, -10];
  forEachValue(mode, precision, values, values.map(v => ~v), 'negative input');
}

function testFractional(mode, precision) {
  // JS applies ToInt32 first, truncating toward zero
  const values = [2.25, 3.5, 3.99, 7.1];
  forEachValue(mode, precision, values, values.map(v => ~v), 'fractional input');
}

function testDoubleNot(mode, precision) {
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function (v1) {
    return ~~v1[this.thread.x];
  }, { output: [4], precision });
  const values = [0, 3, 3.5, 14.28];
  const result = Array.from(kernel(values));
  values.forEach((value, i) => {
    assert.equal(result[i], ~~value, `~~${value} expected ${~~value}, got ${result[i]}`);
  });
  gpu.destroy();
}

const scenarios = {
  'negative input': testNegative,
  'fractional input': testFractional,
  'double not': testDoubleNot,
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
    // negative results need a precision that can represent them
    const run = supported[modeName] && (modeName === 'cpu' || GPU.isSinglePrecisionSupported) ? test : skip;
    run(`bitwise NOT ${scenario} single precision ${modeName}`, () => {
      scenarios[scenario](modes[modeName], 'single');
    });
  });
});
