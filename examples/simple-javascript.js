const { GPU } = require('../src');

const gpu = new GPU({ mode: 'gpu' });

// Look ma! I can javascript on my GPU!
function kernelFunction(anInt, anArray, aNestedArray) {
  const x = .25 + anInt + anArray[this.thread.x] + aNestedArray[this.thread.x][this.thread.y];
  return x;
}

const kernel = gpu.createKernel(kernelFunction, {
  output: [1]
});

const result = kernel(1, [.25], [[1.5]]);

console.log(result[0]); // 3
