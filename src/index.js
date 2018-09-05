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

const WebGL2FunctionBuilder = require('./backend/web-gl2/function-builder');
const WebGL2FunctionNode = require('./backend/web-gl2/function-node');
const WebGL2Kernel = require('./backend/web-gl2/kernel');
const WebGL2Runner = require('./backend/web-gl2/runner');

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

GPU.WebGL2FunctionBuilder = WebGL2FunctionBuilder;
GPU.WebGL2FunctionNode = WebGL2FunctionNode;
GPU.WebGL2Kernel = WebGL2Kernel;
GPU.WebGL2Runner = WebGL2Runner;

if (typeof module !== 'undefined') {
	module.exports = GPU;
}
if (typeof window !== 'undefined') {
	window.GPU = GPU;
}