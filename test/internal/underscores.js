const { assert, skip, test, module: describe, only } = require('qunit');
const { GPU } = require('../../src');

describe('internal: underscores');

function testArguments(mode) {
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function(value_1) {
    return value_1;
  }, { output: [1] });
  assert.equal(kernel(1)[0], 1);
  gpu.destroy();
}

test('arguments auto', () => {
  testArguments();
});
test('arguments gpu', () => {
  testArguments('gpu');
});
(GPU.isWebGLSupported ? test: skip)('arguments webgl', () => {
  testArguments('webgl');
});
(GPU.isWebGL2Supported ? test: skip)('arguments webgl2', () => {
  testArguments('webgl2');
});
(GPU.isHeadlessGLSupported ? test: skip)('arguments headlessgl', () => {
  testArguments('headlessgl');
});
test('arguments cpu', () => {
  testArguments('cpu');
});


function testConstants(mode) {
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function() {
    return this.constants.value_1;
  }, {
    output: [1],
    constants: {
      value_1: 1
    }
  });
  assert.equal(kernel()[0], 1);
  gpu.destroy();
}

test('constants auto', () => {
  testConstants();
});
test('constants gpu', () => {
  testConstants('gpu');
});
(GPU.isWebGLSupported ? test: skip)('constants webgl', () => {
  testConstants('webgl');
});
(GPU.isWebGL2Supported ? test: skip)('constants webgl2', () => {
  testConstants('webgl2');
});
(GPU.isHeadlessGLSupported ? test: skip)('constants headlessgl', () => {
  testConstants('headlessgl');
});
test('constants cpu', () => {
  testConstants('cpu');
});

