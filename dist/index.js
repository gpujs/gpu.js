'use strict';

var GPU = require('./core/gpu');
var alias = require('./core/alias');
var utils = require('./core/utils');
var Input = require('./core/input');
var Texture = require('./core/texture');

var CPUFunctionBuilder = require('./backend/cpu/function-builder');
var CPUFunctionNode = require('./backend/cpu/function-node');
var CPUKernel = require('./backend/cpu/kernel');
var CPURunner = require('./backend/cpu/runner');

var WebGLFunctionBuilder = require('./backend/web-gl/function-builder');
var WebGLFunctionNode = require('./backend/web-gl/function-node');
var WebGLKernel = require('./backend/web-gl/kernel');
var WebGLRunner = require('./backend/web-gl/runner');

GPU.alias = alias;
GPU.utils = utils;
GPU.Texture = Texture;
GPU.Input = Input;
GPU.input = function (value, size) {
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

if (typeof module !== 'undefined') {
	module.exports = GPU;
}
if (typeof window !== 'undefined') {
	window.GPU = GPU;
}