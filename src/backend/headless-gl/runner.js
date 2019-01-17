'use strict';

const GLRunner = require('../gl-runner');
const HeadlessGLKernel = require('./kernel');
const HeadlessGLFunctionBuilder = require('./function-builder');
let isCompatible = null;

try {
	isCompatible = require('gl/webgl').hasOwnProperty('WebGLRenderingContext');
} catch (e) {
	isCompatible = false;
}

class HeadlessGLRunner extends GLRunner {
	static get isCompatible() {
		return isCompatible;
	}

	static isRelatedContext(context) {
		try {
			return context instanceof require('gl/webgl').WebGLRenderingContext;
		} catch (e) {
			return false;
		}
	}

	/**
	 * @desc Instantiates a Runner instance for the kernel.
	 * @param {Object} settings - Settings to instantiate properties in Runner, with given values
	 */
	constructor(settings) {
		super(new HeadlessGLFunctionBuilder(), settings);
		this.Kernel = HeadlessGLKernel;
		this.kernel = null;
	}

	/**
	 * @desc Return the current mode in which gpu.js is executing.
	 * @returns {String} The current mode; "gpu".
	 */
	getMode() {
		return 'gpu';
	}
}

module.exports = HeadlessGLRunner;