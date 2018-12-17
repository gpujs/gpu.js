const GPU = require('../src/index.js');
const Benchmark = require('benchmark');

const suite = new Benchmark.Suite;


const gpuRunner = new GPU({ mode: 'webgl' });
const cpuRunner = new GPU({ mode: 'cpu' });

const size = 512;


// GPU

const iTextureGPUKernel = gpuRunner
  .createKernel(function compute() {
    return this.thread.x;
  })
  .setOutputToTexture(true)
  .setOutput([size, size]);

const jTextureGPUKernel = gpuRunner
  .createKernel(function compute() {
    return 0.89;
  })
  .setOutputToTexture(true)
  .setOutput([size, size]);

const myGPUFunc = gpuRunner
  .createKernel(function compute(i, j) {
    return i[this.thread.x] + j[this.thread.x];
  })
  .setOutputToTexture(true)
  .setOutput([size, size]);

const iTextureGPU = iTextureGPUKernel();
const jTextureGPU = jTextureGPUKernel();

// console.log(myGPUFunc(iTextureGPU, jTextureGPU).toArray(gpuRunner));



// CPU

const myCPUFunc = cpuRunner
  .createKernel(function compute() {
    const i = this.thread.x;
    const j = 0.89;
    return i + j;
  })
  .setOutput([size, size]);



suite
  .add('gpu', function() {
    myGPUFunc(iTextureGPU, jTextureGPU);
  })
  .add('cpu', function() {
    myCPUFunc();
  })
  .on('cycle', function(event) {
    console.log(String(event.target));
  })
  .on('complete', function() {
    console.log('Fastest is ' + this.filter('fastest').map('name'));
  })
  .run();
