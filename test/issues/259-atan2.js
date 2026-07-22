const { assert, skip, test, module: describe } = require('qunit');
const { GPU } = require('../../src');

describe('issue #259');

function buildAtan2KernelResult(mode) {
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function() {
    return Math.atan2(1, 2);
  }, {
    output: [1],
  });
  const result = kernel()[0];
  // GPU atan implementations differ from Math.atan2 in the last ulps of
  // single precision (observed: 0.4636474..0.4636477 across drivers)
  assert.ok(Math.abs(result - Math.atan2(1, 2)) < 1e-5, `${result} deviates from ${Math.atan2(1, 2)}`);
  gpu.destroy();
}

test('Issue #259 atan2 - auto', () => {
  buildAtan2KernelResult();
});

test('Issue #259 atan2 - gpu', () => {
  buildAtan2KernelResult('gpu');
});

(GPU.isWebGLSupported ? test : skip)('Issue #259 atan2 - webgl', () => {
  buildAtan2KernelResult('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('Issue #259 atan2 - webgl2', () => {
  buildAtan2KernelResult('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('Issue #259 atan2 - headlessgl', () => {
  buildAtan2KernelResult('headlessgl');
});

test('Issue #259 atan2 - cpu', () => {
  buildAtan2KernelResult('cpu');
});
