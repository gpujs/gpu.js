function createKernels(mode) {
  const gpu = new GPU({ mode });
  return gpu.createKernels({
    addResult: function add(v1, v2) {
      return v1 + v2;
    },
    divideResult: function divide(v1, v2) {
      return v1 / v2;
    }
  }, function(a, b, c) {
    return divide(add(a[this.thread.y][this.thread.x], b[this.thread.y][this.thread.x]), c[this.thread.y][this.thread.x]);
  }).setDimensions([1]);
}

function createKernel(mode) {
  const gpu = new GPU({ mode });
  return gpu.createKernel(function(a) {
    return a[this.thread.y][this.thread.x];
  }).setDimensions([1]);
}

QUnit.test( "createKernels (auto)", function() {
  var superKernel = createKernels(null);
  var kernel = createKernel(null);
  var output = superKernel([2], [2], [0.5]);
  console.log(output.result);
  console.log(kernel(output.addResult));
  console.log(kernel(output.divideResult));
  var result = QUnit.extend([], output.result);
  QUnit.assert.deepEqual(result, [8]);
});