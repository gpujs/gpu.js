const GPU = require('./gpu');
const utils = require('./utils');

const CPUFunctionBuilder = require('./backend/cpu/function-builder');
const CPUFunctionNode = require('./backend/cpu/function-node');
const CPUKernel = require('./backend/cpu/kernel');
const CPURunner = require('./backend/cpu/runner');

const WebGLFunctionBuilder = require('./backend/web-gl/function-builder');
const WebGLFunctionNode = require('./backend/web-gl/function-node');
const WebGLKernel = require('./backend/web-gl/kernel');
const WebGLRunner = require('./backend/web-gl/runner');


GPU.utils = utils;

GPU.CPUFunctionBuilder = CPUFunctionBuilder;
GPU.CPUFunctionNode = CPUFunctionNode;
GPU.CPUKernel = CPUKernel;
GPU.CPURunner = CPURunner;

GPU.WebGLFunctionBuilder = WebGLFunctionBuilder;
GPU.WebGLFunctionNode = WebGLFunctionNode;
GPU.WebGLKernel = WebGLKernel;
GPU.WebGLRunner = WebGLRunner;

if (typeof module !== 'undefined') {
  module.exports = GPU;
}
if (typeof window !== 'undefined') {
  window.GPU = GPU;
}

