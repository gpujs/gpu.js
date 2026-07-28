const { assert, skip, test, module: describe } = require('qunit');
const { GPU } = require('../../src');

describe('issue #854 - assignment as expression keeps its parentheses');

// (i += 1) * 0.0 used to compile as i += 1.0 * 0.0: the assignment lost its
// parentheses and swallowed the multiplication, so i gained 0 instead of 1
// and the subexpression evaluated to i instead of 0.
function testParens(mode) {
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function (input, lookup) {
    let i = this.thread.x + 1;
    const value = ((i += 1) * 0.0) + lookup[input[i]];
    return value;
  }).setOutput([1]);
  assert.equal(kernel([9, 1, 2, 3], [7, 13, 19, 23])[0], 19);
  gpu.destroy();
}

test('cpu', () => {
  testParens('cpu');
});

(GPU.isWebGLSupported ? test : skip)('webgl', () => {
  testParens('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('webgl2', () => {
  testParens('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('headlessgl', () => {
  testParens('headlessgl');
});
