const { assert, skip, test, module: describe } = require('qunit');
const { GPU } = require('../../src');

describe('features: constants float');
function floatConstantTest(mode) {
  const gpu = new GPU({ mode });
  const float = 200.01;
  const tryConst = gpu.createKernel(
    function() {
      return this.constants.float;
    },
    {
      constants: { float },
      output: [2]
    },
  );
  const result = tryConst();
  const match = new Float32Array([200.01, 200.01]);
  const test = (
    result[0].toFixed(1) === match[0].toFixed(1)
    && result[1].toFixed(1) === match[1].toFixed(1)
  );
  assert.ok(test, 'float constant passed test');
  gpu.destroy();
}

test('auto', () => {
  floatConstantTest(null);
});

test('gpu', () => {
  floatConstantTest('gpu');
});

(GPU.isWebGLSupported ? test : skip)('webgl', () => {
  floatConstantTest('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('webgl2', () => {
  floatConstantTest('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('headlessgl', () => {
  floatConstantTest('headlessgl');
});

test('cpu', () => {
  floatConstantTest('cpu');
});
