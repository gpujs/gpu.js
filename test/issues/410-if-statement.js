const { assert, skip, test, module: describe, only } = require('qunit');
const { GPU } = require('../../src');

describe('issue #410 - if statement when unsigned on NVidia');

function ifStatement(mode) {
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function(a) {
    const paramDenom = a[this.thread.x][1] - a[this.thread.x][0];
    if(paramDenom === 0) {
      return 100;
    }
    return 200;
  })
    .setPrecision('unsigned')
    .setOutput([2]);

  const result =
    kernel(
      [
        [0, 0],
        [0, 2]
      ]
    );

  assert.deepEqual(Array.from(result), [100,200]);
  gpu.destroy();
}

test('auto', () => {
  ifStatement();
});

test('gpu', () => {
  ifStatement('gpu');
});

(GPU.isWebGLSupported ? test : skip)('webgl', () => {
  ifStatement('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('webgl2', () => {
  ifStatement('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('headlessgl', () => {
  ifStatement('headlessgl');
});

test('cpu', () => {
  ifStatement('cpu');
});
