const { assert, skip, test, module: describe, only } = require('qunit');
const { GPU } = require('../../src');

describe('issue #378');

function testOnlyFirstIterationSafari(mode) {
  const gpu = new GPU({ mode: mode });
  const conflictingName = 0.4;
  const kernel = gpu.createKernel(function(iter) {
    let sum = 0;
    for(let i=2; i<iter; i++) {
      sum = sum + i;
    }
    return 2*sum ; //+ this.thread.x;
  })
    .setOutput([10])
    .setConstants({
      conflictingName: conflictingName
    });

  const result = kernel(5);

  assert.deepEqual(Array.from(result), [18,18,18,18,18,18,18,18,18,18]);
  gpu.destroy();
}

(GPU.isWebGLSupported ? test : skip)('Issue #378 - only first iteration safari webgl', () => {
  testOnlyFirstIterationSafari('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('Issue #378 - only first iteration safari webgl2', () => {
  testOnlyFirstIterationSafari('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('Issue #378 - only first iteration safari headlessgl', () => {
  testOnlyFirstIterationSafari('headlessgl');
});
