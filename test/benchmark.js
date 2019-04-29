const { GPU } = require('../src/index.js');
const Benchmark = require('benchmark');

const suite = new Benchmark.Suite();

const gpu = new GPU({ mode: 'gpu' });
const cpu = new GPU({ mode: 'cpu' });

const size = 2048;

const gpuKernel = gpu
  .createKernel(function compute() {
    const i = this.thread.x;
    const j = 0.89;
    return i + j;
  })
  .setPipeline(true)
  .setPrecision('unsigned')
  .setOutput([size, size]);

const cpuKernel = cpu
  .createKernel(function compute() {
    const i = this.thread.x;
    const j = 0.89;
    return i + j;
  })
  .setOutput([size, size]);

// go ahead and build
gpuKernel();
cpuKernel();

// add tests
suite
  .add('gpu', () => {
    gpuKernel();
  })
  .add('cpu', () => {
    cpuKernel();
  })
  // add listeners
  .on('cycle', (event) => {
    console.log(String(event.target));
  })
  .on('complete', function () {
    gpu.destroy();
    cpu.destroy();
    console.log('Fastest is ' + this.filter('fastest').map('name'));
  })
  .run({'async': true });
