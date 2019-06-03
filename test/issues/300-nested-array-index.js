const { assert, skip, test, module: describe } = require('qunit');
const { GPU } = require('../../src');

describe('issue #300');

function nestedArrayIndex(mode) {
  const gpu1 = new GPU({ mode });
  const gpu2 = new GPU({ mode });

  // these 2 should be equivalent
  const broken = gpu1.createKernel(function(input, lookup) {
    return lookup[input[this.thread.x]];
  })
    .setOutput([1]);

  const working = gpu2.createKernel(function(input, lookup) {
    const idx = input[this.thread.x];
    return lookup[idx];
  })
    .setOutput([1]);

  assert.equal(broken([2], [7, 13, 19, 23])[0], 19);
  assert.equal(working([2], [7, 13, 19, 23])[0], 19);

  gpu1.destroy();
  gpu2.destroy();
}

test('Issue #300 nested array index - auto', () => {
  nestedArrayIndex();
});

test('Issue #300 nested array index - gpu', () => {
  nestedArrayIndex('gpu');
});

(GPU.isWebGLSupported ? test : skip)('Issue #300 nested array index - webgl', () => {
  nestedArrayIndex('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('Issue #300 nested array index - webgl2', () => {
  nestedArrayIndex('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('Issue #300 nested array index - headlessgl', () => {
  nestedArrayIndex('headlessgl');
});

test('Issue #300 nested array index - cpu', () => {
  nestedArrayIndex('cpu');
});
