var GPU = require('../../src/index');

(GPU.isWebGLSupported ? QUnit.test : QUnit.skip)('WebGL Decimal Precision', function(assert) {
  var gpu = new GPU({mode: 'webgl'});
  var add = gpu.createKernel(function(a, b) {
    return a + b;
  }).setOutput([1]);
  var addResult = add(0.1, 0.2)[0];
  assert.equal(addResult.toFixed(7), (0.1 + 0.2).toFixed(7));

  var reflectValue = gpu.createKernel(function(a) {
    return a;
  }).setOutput([1]);

  //Just for sanity's sake, recurse the value to see if it spirals out of control
  for (var i = 0; i < 100; i++) {
    var newAddResult = reflectValue(addResult)[0];
    assert.equal(newAddResult, addResult);
    addResult = newAddResult;
  }
  gpu.destroy();
});

(GPU.isWebGL2Supported ? QUnit.test : QUnit.skip)('WebGL2 Decimal Precision', function(assert) {
  var gpu = new GPU({mode: 'webgl2'});
  var add = gpu.createKernel(function(a, b) {
    return a + b;
  }).setOutput([1]);
  var addResult = add(0.1, 0.2)[0];
  assert.equal(addResult.toFixed(7), (0.1 + 0.2).toFixed(7));

  var reflectValue = gpu.createKernel(function(a) {
    return a;
  }).setOutput([1]);

  //Just for sanity's sake, recurse the value to see if it spirals out of control
  for (var i = 0; i < 100; i++) {
    var newAddResult = reflectValue(addResult)[0];
    assert.equal(newAddResult, addResult);
    addResult = newAddResult;
  }
  gpu.destroy();
});

(GPU.isHeadlessGLSupported ? QUnit.test : QUnit.skip)('HeadlessGL Decimal Precision', function(assert) {
  var gpu = new GPU({mode: 'headlessgl'});
  var add = gpu.createKernel(function(a, b) {
    return a + b;
  }).setOutput([1]);
  var addResult = add(0.1, 0.2)[0];
  assert.equal(addResult.toFixed(7), (0.1 + 0.2).toFixed(7));

  var reflectValue = gpu.createKernel(function(a) {
    return a;
  }).setOutput([1]);

  //Just for sanity's sake, recurse the value to see if it spirals out of control
  for (var i = 0; i < 100; i++) {
    var newAddResult = reflectValue(addResult)[0];
    assert.equal(newAddResult, addResult);
    addResult = newAddResult;
  }
  gpu.destroy();
});
