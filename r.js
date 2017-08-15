const GPU = require('./src/index');

const gpu = new GPU({ mode: 'gpu' });

//console.log(gpu);

const kernel = gpu.createKernel(function(a, b) {
  return a[id] + b[id];
});

kernel.build(1, 2);

//console.log(kernel);

//process.exit(0);