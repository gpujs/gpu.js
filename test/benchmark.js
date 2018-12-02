const GPU = require('../src/index.js');
const Benchmark = require('benchmark');

const suite = new Benchmark.Suite;


const gpuRunner = new GPU({ mode: 'webgl' });
const cpuRunner = new GPU({ mode: 'cpu' });

const size = 200;

const myGPUFunc = gpuRunner
  .createKernel(function compute() {
    const i = this.thread.x;
    const j = 0.89;
    return i + j;
  })
  // .setOutputToTexture(true)
  .setOutput([size, size, size]);

const myCPUFunc = cpuRunner
  .createKernel(function compute() {
    const i = this.thread.x;
    const j = 0.89;
    return i + j;
  })
  .setOutput([size, size, size]);




// add tests
suite.add('cpu', function() {
    myGPUFunc();
  })
  .add('gpu', function() {
    myCPUFunc();
  })
  // add listeners
  .on('cycle', function(event) {
    console.log(String(event.target));
  })
  .on('complete', function() {
    console.log('Fastest is ' + this.filter('fastest').map('name'));
  })
  // run async
  .run();
