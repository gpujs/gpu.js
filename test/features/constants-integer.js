const { assert, skip, test, module: describe, only } = require('qunit');
const { GPU } = require('../../src');

describe('features: constants integer');

function integerConstantTest(mode) {
  const gpu = new GPU({ mode });
  const int = 200;
  const tryConst = gpu.createKernel(
    function() {
      return this.constants.int;
    },
    {
      constants: { int }
    }
  ).setOutput([2]);
  const result = tryConst();
  const match = new Float32Array([200, 200]);
  const test = (result[0] === match[0] && result[1] === match[1]);
  assert.ok(test, 'int constant passed test');
  gpu.destroy();
}

test('auto', () => {
  integerConstantTest(null);
});

test('gpu', () => {
  integerConstantTest('gpu');
});

(GPU.isWebGLSupported ? test : skip)('webgl', () => {
  integerConstantTest('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('webgl2', () => {
  integerConstantTest('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('headlessgl', () => {
  integerConstantTest('headlessgl');
});

test('cpu', () => {
  integerConstantTest('cpu');
});
