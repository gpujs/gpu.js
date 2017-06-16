QUnit.test( "createKernels (auto)", function() {
  const gpu = new GPU();
  const kernels = gpu.createKernels({
    addResult: function add(v1, v2) {
      return v1 + v2;
    },
    divideResult: function divide(v1, v2) {
      return v1 / v2;
    }
  }, function(a, b, c) {
    return divide(add(a[this.thread.y][this.thread.x], b[this.thread.y][this.thread.x]), c[this.thread.y][this.thread.x]) + 0.33;
  })
    .setDimensions([1])
    .setDebug(true);
  const kernel = gpu.createKernel(function(a) {
    return a[this.thread.y][this.thread.x];
  }).setDimensions([1]);
  const kernelsResult = kernels([1], [0.333], [2]);
  console.log(kernelsResult.result);
  console.log(kernel(kernelsResult.addResult));
  console.log(kernel(kernelsResult.divideResult));
});