const GPU = require('./src/index');

const gpu = new GPU({ mode: 'gpu' });

console.log(gpu);

const kernel = gpu.createKernel(function(a, b) {
  return a + b;
});

kernel.build(1, 2);

console.log(kernel);

process.exit(0);