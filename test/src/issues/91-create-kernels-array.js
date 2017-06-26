// Code goes here
var A = [
  [1, 1],
  [1, 1],
  [1, 1]
];

var B = [
  [1, 1, 1],
  [1, 1, 1]
];

var gpu = new GPU();


function multiply(b, a, y, x) {
  var sum = 0;
  for (var i = 0; i < 2; i++) {
    sum += b[y][i] * a[i][x];
  }
  return sum;
}

var kernels = gpu.createKernels({
  multiplyResult: multiply
}, function(a, b) {
  return multiply(b, a, this.thread.y, this.thread.x);
})
  .setDebug(true)
  .setDimensions([B.length, A.length]);

console.log(kernels(A, B));