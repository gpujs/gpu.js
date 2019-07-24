const { assert, skip, test, module: describe } = require('qunit');
const { GPU } = require('../../src');

describe('issue #152');

function forVars(mode) {
  const gpu = new GPU({ mode });

  const kernel = gpu.createKernel(function() {
    let sum = 0;
    for (let i = 0; i < 2; i++) {
      sum += i;
    }
    return sum;
  })
    .setOutput([1, 1]);

  const result = kernel();
  assert.equal(result.length, 1);
  assert.equal(result[0], 1);
  gpu.destroy();
}

test('Issue #152 - for vars cpu', () => {
  forVars('cpu');
});

test('Issue #152 - for vars auto', () => {
  forVars('gpu');
});

test('Issue #152 - for vars gpu', () => {
  forVars('gpu');
});

(GPU.isWebGLSupported ? test : skip)('Issue #152 - for vars webgl', () => {
  forVars('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('Issue #152 - for vars webgl2', () => {
  forVars('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('Issue #152 - for vars headlessgl', () => {
  forVars('headlessgl');
});
