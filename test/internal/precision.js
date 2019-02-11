const { assert, skip, test, module: describe } = require('qunit');
const { GPU } = require('../../src');

describe('internal: precision');

(GPU.isWebGLSupported ? test : skip)('WebGL Decimal Precision', () => {
  const gpu = new GPU({mode: 'webgl'});
  const add = gpu.createKernel(function(a, b) {
    return a + b;
  }).setOutput([1]);
  let addResult = add(0.1, 0.2)[0];
  assert.equal(addResult.toFixed(7), (0.1 + 0.2).toFixed(7));

  const reflectValue = gpu.createKernel(function(a) {
    return a;
  }).setOutput([1]);

  //Just for sanity's sake, recurse the value to see if it spirals out of control
  for (let i = 0; i < 100; i++) {
    const newAddResult = reflectValue(addResult)[0];
    assert.equal(newAddResult, addResult);
    addResult = newAddResult;
  }
  gpu.destroy();
});

(GPU.isWebGL2Supported ? test : skip)('WebGL2 Decimal Precision', () => {
  const gpu = new GPU({mode: 'webgl2'});
  const add = gpu.createKernel(function(a, b) {
    return a + b;
  }).setOutput([1]);
  let addResult = add(0.1, 0.2)[0];
  assert.equal(addResult.toFixed(7), (0.1 + 0.2).toFixed(7));

  const reflectValue = gpu.createKernel(function(a) {
    return a;
  }).setOutput([1]);

  //Just for sanity's sake, recurse the value to see if it spirals out of control
  for (let i = 0; i < 100; i++) {
    const newAddResult = reflectValue(addResult)[0];
    assert.equal(newAddResult, addResult);
    addResult = newAddResult;
  }
  gpu.destroy();
});

(GPU.isHeadlessGLSupported ? test : skip)('HeadlessGL Decimal Precision', () => {
  const gpu = new GPU({mode: 'headlessgl'});
  const add = gpu.createKernel(function(a, b) {
    return a + b;
  }).setOutput([1]);
  let addResult = add(0.1, 0.2)[0];
  assert.equal(addResult.toFixed(7), (0.1 + 0.2).toFixed(7));

  const reflectValue = gpu.createKernel(function(a) {
    return a;
  }).setOutput([1]);

  //Just for sanity's sake, recurse the value to see if it spirals out of control
  for (let i = 0; i < 100; i++) {
    const newAddResult = reflectValue(addResult)[0];
    assert.equal(newAddResult, addResult);
    addResult = newAddResult;
  }
  gpu.destroy();
});
