const { assert, skip, test, module: describe } = require('qunit');
const { GPU } = require('../../src');

describe('issue #857');

// A plain Array and a Float32Array holding the same numbers flatten into the
// same upload buffer, so one kernel should take either. The GL kernel values
// rejected on constructor identity instead, and because both spell their type
// 'Array' the switched-to kernel had the same signature and rejected it again
// -- so the call never settled and threw after four rebuilds. cpu never had
// the check and always worked.

// What is under test is that the container does not matter, not how exactly a
// precision round-trips: the unsigned encoder is bit-exact on some drivers and
// off by ~1e-6 on others (SwiftShader), which would fail an equality assertion
// for reasons that have nothing to do with this bug.
function rounded(values) {
  return Array.from(values).map(value => Math.round(value * 1e4) / 1e4);
}

function testInterchangeable(mode, precision, assert) {
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function (a) {
    return a[this.thread.x] * 2;
  }, { output: [4], precision });
  assert.deepEqual(rounded(kernel([1, 2, 3, 4])), [2, 4, 6, 8], 'plain array');
  assert.deepEqual(
    rounded(kernel(Float32Array.from([5, 6, 7, 8]))),
    [10, 12, 14, 16],
    'Float32Array on the same kernel');
  assert.deepEqual(rounded(kernel([9, 10, 11, 12])), [18, 20, 22, 24], 'and back to a plain array');
  gpu.destroy();
}

const MODES = [
  ['cpu', true],
  ['webgl', GPU.isWebGLSupported],
  ['webgl2', GPU.isWebGL2Supported],
  ['headlessgl', GPU.isHeadlessGLSupported],
];

for (const [mode, supported] of MODES) {
  (supported ? test : skip)(`Issue #857 - Array then Float32Array single precision ${ mode }`, assert => {
    testInterchangeable(mode, 'single', assert);
  });
  (supported ? test : skip)(`Issue #857 - Array then Float32Array unsigned precision ${ mode }`, assert => {
    testInterchangeable(mode, 'unsigned', assert);
  });
  (supported ? test : skip)(`Issue #857 - Float32Array first, then Array ${ mode }`, assert => {
    const gpu = new GPU({ mode });
    const kernel = gpu.createKernel(function (a) {
      return a[this.thread.x] * 2;
    }, { output: [4] });
    assert.deepEqual(Array.from(kernel(Float32Array.from([1, 2, 3, 4]))), [2, 4, 6, 8]);
    assert.deepEqual(Array.from(kernel([5, 6, 7, 8])), [10, 12, 14, 16]);
    gpu.destroy();
  });
  (supported ? test : skip)(`Issue #857 - a changed shape still switches kernels ${ mode }`, assert => {
    // relaxing the container check must not let a differently-shaped value
    // upload into the texture built for the old shape
    const gpu = new GPU({ mode });
    const build = g => g.createKernel(function (a) {
      return a[this.thread.x][0];
    }, { output: [2] });
    const kernel = build(gpu);
    assert.deepEqual(Array.from(kernel([[1, 2], [3, 4]])), [1, 3], 'first shape');
    const reference = build(new GPU({ mode }));
    assert.deepEqual(
      Array.from(kernel([[9, 8], [7, 6]])),
      Array.from(reference([[9, 8], [7, 6]])),
      'same answer as a kernel that only saw this value');
    gpu.destroy();
  });
}
