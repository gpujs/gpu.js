const { assert, skip, test, module: describe } = require('qunit');
const { GPU } = require('../../src');

describe('feature: modulo comparison');

// `%` lowers to a float-returning GLSL helper, but getType() used to report the
// left operand's type when fixIntegerDivisionAccuracy was off, so `i % 2 === 0`
// compiled to a float/int comparison and the shader was rejected outright:
//   '==' : no operation '==' exists that takes a left-hand operand of type
//   'lowp float' and a right operand of type 'const int'
// The flag is derived from GPU features, so the break only showed on hardware
// where integer division is already accurate — desktop Chrome/Firefox on
// Windows, but not headless-gl or Apple GPUs. Both states are pinned here.
function testModuloEquality(mode, fixIntegerDivisionAccuracy) {
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function () {
    let total = 0;
    for (let i = 0; i < 10; i++) {
      if (i % 2 === 0) {
        total += i;
      }
    }
    return total;
  }, { output: [1], fixIntegerDivisionAccuracy });
  // 0 + 2 + 4 + 6 + 8
  assert.equal(kernel()[0], 20);
  gpu.destroy();
}

function testModuloInequality(mode, fixIntegerDivisionAccuracy) {
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function () {
    let total = 0;
    for (let i = 0; i < 6; i++) {
      if (i % 3 !== 0) {
        total += 1;
      }
    }
    return total;
  }, { output: [1], fixIntegerDivisionAccuracy });
  // 1, 2, 4, 5
  assert.equal(kernel()[0], 4);
  gpu.destroy();
}

function testModuloAsIndex(mode, fixIntegerDivisionAccuracy) {
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function (a) {
    return a[this.thread.x % 3];
  }, { output: [4], fixIntegerDivisionAccuracy });
  assert.deepEqual(Array.from(kernel([10, 20, 30, 40])), [10, 20, 30, 10]);
  gpu.destroy();
}

function testModuloKeepsFraction(mode, fixIntegerDivisionAccuracy) {
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function (a) {
    return a[this.thread.x] % 2.5;
  }, { output: [4], fixIntegerDivisionAccuracy });
  const result = Array.from(kernel([1, 3, 6, 9]));
  [1, 0.5, 1, 1.5].forEach((expected, i) => {
    assert.ok(Math.abs(result[i] - expected) < 0.01, `index ${i}: expected ${expected}, got ${result[i]}`);
  });
  gpu.destroy();
}

const scenarios = {
  'modulo equality': testModuloEquality,
  'modulo inequality': testModuloInequality,
  'modulo as index': testModuloAsIndex,
  'modulo keeps fraction': testModuloKeepsFraction,
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
      const run = supported[modeName] ? test : skip;
      run(`${scenario} ${modeName} fixIntegerDivisionAccuracy=${fix}`, () => {
        scenarios[scenario](modes[modeName], fix);
      });
    });
  });
});
