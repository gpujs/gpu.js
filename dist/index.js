'use strict';

var GPU = require('./gpu');
var alias = require('./alias');
var utils = require('./utils');
var Input = require('./input');
var Texture = require('./texture');
var FunctionBuilder = require('./backend/function-builder');

var CPUFunctionNode = require('./backend/cpu/function-node');
var CPUKernel = require('./backend/cpu/kernel');

var HeadlessGLKernel = require('./backend/headless-gl/kernel');

var WebGLFunctionNode = require('./backend/web-gl/function-node');
var WebGLKernel = require('./backend/web-gl/kernel');

var WebGL2FunctionNode = require('./backend/web-gl2/function-node');
var WebGL2Kernel = require('./backend/web-gl2/kernel');

GPU.alias = alias;
GPU.utils = utils;
GPU.FunctionBuilder = FunctionBuilder;
GPU.Texture = Texture;
GPU.Input = Input;
GPU.input = function (value, size) {
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