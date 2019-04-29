const { GPU } = require('../src/index.js');
const Benchmark = require('benchmark');

const suite = new Benchmark.Suite;

const size = 512;

const gpu = new GPU({ mode: 'gpu' });
const cpu = new GPU({ mode: 'cpu' });

const gpuKernel = gpu
  .createKernel(function(i, j) {
    return i[this.thread.x] + j[this.thread.x];
  })
  .setOutput([size, size]);
const gpuArg1 = gpu
  .createKernel(function() {
    return 0.89;
  })
  .setPipeline(true)
  .setOutput([size, size])();
const gpuArg2 = gpu
  .createKernel(function() {
    return this.thread.x;
  })
  .setPipeline(true)
  .setOutput([size, size])();

const cpuKernel = cpu
  .createKernel(function(i, j) {
    return i[this.thread.x] + j[this.thread.x];
  })
  .setOutput([size, size]);
const cpuArg1 = cpu
  .createKernel(function() {
    return 0.89;
  })
  .setOutput([size, size])();
const cpuArg2 = cpu
  .createKernel(function() {
    return this.thread.x;
  })
  .setOutput([size, size])();

suite
  .add('gpu', () => {
    gpuKernel(gpuArg1, gpuArg2);
  })
  .add('cpu', () => {
    cpuKernel(cpuArg1, cpuArg2);
  })
  .on('cycle', (event) => {
    console.log(String(event.target));
  })
  .on('complete', function () {
    gpu.destroy();
    cpu.destroy();
    console.log('Fastest is ' + this.filter('fastest').map('name'));
  })
  .run();
