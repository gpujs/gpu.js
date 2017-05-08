const GPU = require('./gpu');
const utils = require('./utils');

const CPUFunctionBuilder = require('./backend/cpu/cpu-function-builder');
const CPUFunctionNode = require('./backend/cpu/cpu-function-node');
const CPUKernel = require('./backend/cpu/cpu-kernel');
const CPURunner = require('./backend/cpu/cpu-runner');

const GPUFunctionBuilder = require('./backend/gpu/gpu-function-builder');
const GPUFunctionNode = require('./backend/gpu/gpu-function-node');
const GPUKernel = require('./backend/gpu/gpu-kernel');
const GPURunner = require('./backend/gpu/gpu-runner');


GPU.utils = utils;

GPU.CPUFunctionBuilder = CPUFunctionBuilder;
GPU.CPUFunctionNode = CPUFunctionNode;
GPU.CPUKernel = CPUKernel;
GPU.CPURunner = CPURunner;

GPU.GPUFunctionBuilder = GPUFunctionBuilder;
GPU.GPUFunctionNode = GPUFunctionNode;
GPU.GPUKernel = GPUKernel;
GPU.GPURunner = GPURunner;

if (typeof module !== 'undefined') {
  module.exports = GPU;
}
if (typeof window !== 'undefined') {
  window.GPU = GPU;
}

