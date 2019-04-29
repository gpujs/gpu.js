const { assert, skip, test, module: describe, only } = require('qunit');
const { GPU } = require('../../src');

describe('json serialize');

function testJSONSerialize(mode) {
  const gpu = new GPU({mode});

  const kernel = gpu.createKernel(function (value) {
    return value;
  }, {output: [1]});

  kernel(1);

  const json = kernel.toJSON();

  const jsonKernel = gpu.createKernel(json);

  assert.equal(jsonKernel(3)[0], 3);
}

test('auto', () => {
  testJSONSerialize();
});

test('gpu', () => {
  testJSONSerialize('gpu');
});

(GPU.isWebGLSupported ? test : skip)('webgl', () => {
  testJSONSerialize('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('webgl2', () => {
  testJSONSerialize('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('headlessgl', () => {
  testJSONSerialize('headlessgl');
});

test('cpu', () => {
  testJSONSerialize('cpu');
});
