const GPU = require('../src/index.js');
const Benchmark = require('benchmark');

const suite = new Benchmark.Suite;


const gpuRunner = new GPU({ mode: 'webgl' });
const cpuRunner = new GPU({ mode: 'cpu' });

const size = 512;


// // GPU

// const iTextureGPU = gpuRunner
//   .createKernel(function compute() {
//     return this.thread.x;
//   })
//   .setOutputToTexture(true)
//   .setOutput([size, size]);

// const jTextureGPU = gpuRunner
//   .createKernel(function compute() {
//     return 0.89;
//   })
//   .setOutputToTexture(true)
//   .setOutput([size, size]);

// const myGPUFunc = gpuRunner
//   .createKernel(function compute(i, j) {
//     return i[this.thread.x] + j[this.thread.x];
//   })
//   .setOutputToTexture(true)
//   .setOutput([size, size]);


// // CPU

// const iTextureCPU = cpuRunner
//   .createKernel(function compute() {
//     return this.thread.x;
//   })
//   .setOutput([size, size]);

// const jTextureCPU = cpuRunner
//   .createKernel(function compute() {
//     return 0.89;
//   })
//   .setOutput([size, size]);

// const myCPUFunc = cpuRunner
//   .createKernel(function compute(i, j) {
//     return i[this.thread.x] + j[this.thread.x];
//   })
//   .setOutput([size, size]);



// suite
//   .add('gpu', function() {
//     myGPUFunc(iTextureGPU, jTextureGPU);
//   })
//   .add('cpu', function() {
//     myCPUFunc(iTextureCPU, jTextureCPU);
//   })
//   .on('cycle', function(event) {
//     console.log(String(event.target));
//   })
//   .on('complete', function() {
//     console.log('Fastest is ' + this.filter('fastest').map('name'));
//   })
//   .run();



// SIMPLE

const myGPUFunc = gpuRunner
  .createKernel(function compute() {
    const i = this.thread.x;
    const j = 0.89;
    return i + j;
  })
  .setOutputToTexture(true)
  .setOutput([size, size]);

const myCPUFunc = cpuRunner
  .createKernel(function compute() {
    const i = this.thread.x;
    const j = 0.89;
    return i + j;
  })
  .setOutput([size, size]);


// add tests
suite
  .add('gpu', function() {
    myGPUFunc();
  })
  .add('cpu', function() {
    myCPUFunc();
  })
  // add listeners
  .on('cycle', function(event) {
    console.log(String(event.target));
  })
  .on('complete', function() {
    console.log('Fastest is ' + this.filter('fastest').map('name'));
  })
  .run({ 'async': true });
