const { assert, skip, test, module: describe, only } = require('qunit');
const { GPU } = require('../../../src');

describe('features: to-string as file');

function toStringAsFileTest(mode) {
  const path = __dirname + `/to-string-as-file-${mode}.js`;
  const fs = require('fs');
  if (fs.existsSync(path)) {
    fs.unlinkSync(path);
  }
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function(v) {
    return v[this.thread.y][this.thread.x] + 1;
  }, { output: [1, 1] });
  const a = [[1]];
  const expected = kernel(a);
  assert.deepEqual(expected, [new Float32Array([2])]);
  const kernelAsString = kernel.toString(a);
  fs.writeFileSync(path, `module.exports = ${kernelAsString};`);
  const toStringAsFile = require(path);
  const restoredKernel = toStringAsFile({ context: kernel.context });
  const result = restoredKernel(a);
  assert.deepEqual(result, expected);
  fs.unlinkSync(path);
  gpu.destroy();
}

(GPU.isHeadlessGLSupported ? test : skip)('can save and restore function headlessgl', () => {
  toStringAsFileTest('headlessgl');
});

(GPU.isHeadlessGLSupported ? test : skip)('can save and restore function cpu', () => {
  toStringAsFileTest('cpu');
});


