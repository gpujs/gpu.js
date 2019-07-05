const { assert, skip, test, module: describe } = require('qunit');
const { GPU } = require('../../src');

describe('issue #487 - pipeline dynamic arguments');

function testPipelineDynamicArguments(mode) {
  const gpu = new GPU({mode: mode});

  const kernel = gpu.createKernel(function (w) {
    return this.thread.x + this.thread.y * w;
  })
    .setPipeline(true)
    .setDynamicOutput(true);

  const sumRow = gpu.createKernel(function (texture, w) {
    let sum = 0;
    for (let i = 0; i < w; i++)
      sum = sum + texture[this.thread.x][i];
    return sum;
  })
    .setDynamicArguments(true)
    .setDynamicOutput(true);

  function doAThing(w, h) {
    kernel.setOutput([w, h]);
    let intermediate = kernel(w);
    const array = intermediate.toArray();
    assert.equal(array.length, h);
    assert.equal(array[0].length, w);
    sumRow.setOutput([h]);
    const result = sumRow(intermediate, w);
    assert.equal(result.length, h);
    assert.equal(result[0].length, undefined);
  }

  doAThing(10, 5);
  doAThing(3, 2);
  gpu.destroy();
}

test('(GPU only) auto', () => {
  testPipelineDynamicArguments();
});

test('(GPU only) gpu', () => {
  testPipelineDynamicArguments('gpu');
});

(GPU.isWebGLSupported ? test : skip)('(GPU only) webgl', () => {
  testPipelineDynamicArguments('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('(GPU only) webgl2', () => {
  testPipelineDynamicArguments('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('(GPU only) headlessgl', () => {
  testPipelineDynamicArguments('headlessgl');
});
