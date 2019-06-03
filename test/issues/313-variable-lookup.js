const { assert, skip, test, module: describe } = require('qunit');
const { GPU } = require('../../src');

describe('issue #313');

function variableLookup(mode) {
  function mult2(scale) {
    return 2*scale;
  }

  const gpu = new GPU({
    mode,
    functions: [mult2]
  });

  const render1 = gpu.createKernel(function(input) {
    return (mult2(input) + mult2(input*2) + mult2(input*1))  // RIGHT
  })
    .setOutput([1]);

  const render2 = gpu.createKernel(function(input) {
    return (mult2(input) + mult2(input*2) + mult2(input)); // WRONG
  })
    .setOutput([1]);

  assert.equal(render1(1)[0], 8, 'render1 equals 8');
  assert.equal(render2(1)[0], 8, 'render2 equals 8');
  gpu.destroy();
}
test('Issue #313 Mismatch argument lookup - auto', () => {
  variableLookup();
});
test('Issue #313 Mismatch argument lookup - gpu', () => {
  variableLookup('gpu');
});
(GPU.isWebGLSupported ? test : skip)('Issue #313 Mismatch argument lookup - webgl', () => {
  variableLookup('webgl');
});
(GPU.isWebGL2Supported ? test : skip)('Issue #313 Mismatch argument lookup - webgl2', () => {
  variableLookup('webgl2');
});
(GPU.isHeadlessGLSupported ? test : skip)('Issue #313 Mismatch argument lookup - headlessgl', () => {
  variableLookup('headlessgl');
});
test('Issue #313 Mismatch argument lookup - cpu', () => {
  variableLookup('cpu');
});
