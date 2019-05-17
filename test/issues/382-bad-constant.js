const { assert, skip, test, module: describe, only } = require('qunit');
const { GPU } = require('../../src');

describe('issue #382');

function testModKernel(mode) {
  const gpu = new GPU({ mode: mode });
  const conflictingName = 0.4;
  const kernel = gpu.createKernel(function(a, conflictingName) {
    return a[this.thread.x] + this.constants.conflictingName + conflictingName;
  })
    .setOutput([1])
    .setConstants({
      conflictingName: conflictingName
    });

  const result = kernel([1], 0.6);

  assert.equal(result[0], 2);
  gpu.destroy();
}

(GPU.isWebGLSupported ? test : skip)('Issue #382 - bad constant webgl', () => {
  testModKernel('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('Issue #382 - bad constant webgl2', () => {
  testModKernel('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('Issue #382 - bad constant headlessgl', () => {
  testModKernel('headlessgl');
});
