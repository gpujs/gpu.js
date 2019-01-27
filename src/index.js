const GPU = require('./gpu');
const alias = require('./alias');
const utils = require('./utils');
const Input = require('./input');
const Texture = require('./texture');
const FunctionBuilder = require('./backend/function-builder');

const CPUFunctionNode = require('./backend/cpu/function-node');
const CPUKernel = require('./backend/cpu/kernel');

const HeadlessGLKernel = require('./backend/headless-gl/kernel');

const WebGLFunctionNode = require('./backend/web-gl/function-node');
const WebGLKernel = require('./backend/web-gl/kernel');

const WebGL2FunctionNode = require('./backend/web-gl2/function-node');
const WebGL2Kernel = require('./backend/web-gl2/kernel');

GPU.alias = alias;
GPU.utils = utils;
GPU.FunctionBuilder = FunctionBuilder;
GPU.Texture = Texture;
GPU.Input = Input;
GPU.input = (value, size) => {
	return new Input(value, size);
};

GPU.CPUFunctionNode = CPUFunctionNode;
GPU.CPUKernel = CPUKernel;

GPU.HeadlessGLKernel = HeadlessGLKernel;

GPU.WebGLFunctionNode = WebGLFunctionNode;
GPU.WebGLKernel = WebGLKernel;

GPU.WebGL2FunctionNode = WebGL2FunctionNode;
GPU.WebGL2Kernel = WebGL2Kernel;

if (typeof module !== 'undefined') {
	module.exports = GPU;
}
if (typeof window !== 'undefined') {
	window.GPU = GPU;
}
if (typeof self !== 'undefined') {
	self.GPU = GPU;
}