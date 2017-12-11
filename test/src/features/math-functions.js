function mathRandomFunction(mode) {
  const gpu = new GPU({ mode: mode });
  const kernel = gpu.createKernel(function() {
    return Math.random();
  })
    .setOutput([9]);

  const result = kernel();
  QUnit.assert.deepEqual(
    result.some(function(value) { return value <= 0 || value >= 1}), false);
}

QUnit.test( "math random function (auto)", function() {
  mathRandomFunction();
});

QUnit.test( "math random functions (WebGL Only)", function() {
  mathRandomFunction('webgl');
});

QUnit.test( "math random functions (CPU Only)", function() {
  mathRandomFunction('cpu');
});