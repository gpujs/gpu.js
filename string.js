const argument1 = [1];
const { glWiretap } = require('gl-wiretap');
const { GPU } = require('./src');
const gl = require('gl')(1, 1);
const context = glWiretap(gl, {
  variables: {
    argument1,
  }
});
const gpu = new GPU({ mode: 'headlessgl', context });
const kernel = gpu.createKernel(function(v) {
  return v[this.thread.x];
}, { output: [1] });
kernel.build([1]);
let output = [];
output.push(context.toString());
context.reset();
// kernel.kernelArguments.forEach(kernelValue => {
//   const originalUpdateValue = kernelValue.updateValue;
//   kernelValue.updateValue = (value) => {
//     output.push(context.toString());
//     switch (typeof value) {
//
//     }
//     kernelValue.updateValue = originalUpdateValue;
//   };
// });
console.log('\n\n\n resetting \n\n\n');
kernel.run([1]);
console.log(context.toString());
