'use strict';

const GPU = require('./core/gpu');
const alias = require('./core/alias');
const utils = require('./core/utils');
const Input = require('./core/input');
const Texture = require('./core/texture');

const CPUFunctionBuilder = require('./backend/cpu/function-builder');
const CPUFunctionNode = require('./backend/cpu/function-node');
const CPUKernel = require('./backend/cpu/kernel');
const CPURunner = require('./backend/cpu/runner');

const WebGLFunctionBuilder = require('./backend/web-gl/function-builder');
const WebGLFunctionNode = require('./backend/web-gl/function-node');
const WebGLKernel = require('./backend/web-gl/kernel');
const WebGLRunner = require('./backend/web-gl/runner');


// const OpenCLFunctionBuilder = require('./backend/open-cl/function-builder');
// const OpenCLFunctionNode = require('./backend/open-cl/function-node');
// const OpenCLKernel = require('./backend/open-cl/kernel');
// const OpenCLRunner = require('./backend/open-cl/runner');

GPU.alias = alias;
GPU.utils = utils;
GPU.Texture = Texture;
GPU.Input = Input;
GPU.input = (value, size) => {
	return new Input(value, size);
};

GPU.CPUFunctionBuilder = CPUFunctionBuilder;
GPU.CPUFunctionNode = CPUFunctionNode;
GPU.CPUKernel = CPUKernel;
GPU.CPURunner = CPURunner;

GPU.WebGLFunctionBuilder = WebGLFunctionBuilder;
GPU.WebGLFunctionNode = WebGLFunctionNode;
GPU.WebGLKernel = WebGLKernel;
GPU.WebGLRunner = WebGLRunner;

// GPU.OpenCLFunctionBuilder = OpenCLFunctionBuilder;
// GPU.OpenCLFunctionNode = OpenCLFunctionNode;
// GPU.OpenCLKernel = OpenCLKernel;
// GPU.OpenCLRunner = OpenCLRunner;

if (typeof module !== 'undefined') {
	module.exports = GPU;
}
if (typeof window !== 'undefined') {
	window.GPU = GPU;
}