const { GPU } = require('../src');
const gpu1 = new GPU();

const kernel1 = gpu1.createKernel(function(value) {
  return value * 100;
}, { output: [1] });

const resultFromRegularKernel = kernel1(42);
const json = kernel1.toJSON();
console.log(resultFromRegularKernel);

// Use bin/gpu-browser-core.js to get "CORE" mode, which works only with JSON
const gpu2 = new GPU();
const kernel2 = gpu2.createKernel(json);
const resultFromJsonKernel = kernel2(42);
console.log(resultFromJsonKernel);

