const GPU = require('./gpu');
const CPUFunctionBuilder = require('./backend/cpu/cpu-function-builder');
const GPUFunctionBuilder = require('./backend/gpu/gpu-function-builder');
GPU.CPUFunctionBuilder = CPUFunctionBuilder;
GPU.CPUFunctionBuilder = CPUFunctionBuilder;
module.exports = GPU;
if (typeof window !== 'undefined') {
  window.GPU = GPU;
}

