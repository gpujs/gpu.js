const { GPU } = require('../src/index.js');
const Benchmark = require('benchmark');

const suite = new Benchmark.Suite();

const gpu = new GPU({ mode: 'gpu' });
const cpu = new GPU({ mode: 'cpu' });

const size = 1024;
const a = randomMatrix(size, size);
const b = randomMatrix(size, size);
function randomMatrix(width, height) {
  const matrix = new Array(height);
  for (let y = 0; y < height; y++) {
    const row = matrix[y] = new Float32Array(width);
    for (let x = 0; x < width; x++) {
      row[x] = Math.random();
    }
  }
  return matrix;
}

const gpuKernel = gpu
  .createKernel(function(a, b) {
    let sum = 0;
    for (let i = 0; i < this.constants.size; i++) {
      sum += a[this.thread.y][i] * b[i][this.thread.x];
    }
    return sum;
  })
  .setConstants({
    size
  })
  .setPipeline(false)
  .setPrecision('unsigned')
  .setOutput([size, size]);

const cpuKernel = cpu
  .createKernel(function(a, b) {
    let sum = 0;
    for (let i = 0; i < this.constants.size; i++) {
      sum += a[this.thread.y][i] * b[i][this.thread.x];
    }
    return sum;
  })
  .setConstants({
    size
  })
  .setOutput([size, size]);

// go ahead and build
gpuKernel(a, b);
cpuKernel(a, b);

// add tests
suite
  .add('gpu', () => {
    gpuKernel(a, b);
  })
  .add('cpu', () => {
    cpuKernel(a, b);
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
  .run({ async: false });
