'use strict';

const getContext = require('gl');
const GLRunner = require('../gl-runner');
const HeadlessGLFunctionBuilder = require('./function-builder');
const HeadlessGLKernel = require('./kernel');
let isSupported = null;
let testCanvas = null;
let testContext = null;
let testFunctionBuilder = null;
let testExtensions = null;

class HeadlessGLRunner extends GLRunner {
	static get FunctionBuilder() {
		return HeadlessGLFunctionBuilder;
	}

	static get Kernel() {
		return HeadlessGLKernel;
	}

	static get isSupported() {
		if (isSupported !== null) return isSupported;
		HeadlessGLRunner.setupFeatureChecks();
		isSupported = testContext !== null;
		return isSupported;
	}

	static setupFeatureChecks() {
		testCanvas = null;
		testExtensions = null;
		if (typeof getContext !== 'function') return;
		testContext = getContext(2, 2, {
			preserveDrawingBuffer: true
		});
		testExtensions = {
			STACKGL_resize_drawingbuffer: testContext.getExtension('STACKGL_resize_drawingbuffer'),
			STACKGL_destroy_context: testContext.getExtension('STACKGL_destroy_context'),
			OES_texture_float: testContext.getExtension('OES_texture_float'),
			OES_texture_float_linear: testContext.getExtension('OES_texture_float_linear'),
			OES_element_index_uint: testContext.getExtension('OES_element_index_uint'),
		};
		testFunctionBuilder = new this.FunctionBuilder();
	}

	static isContextMatch(context) {
		try {
			return context.getParameter(context.RENDERER) === 'ANGLE';
		} catch (e) {
			return false;
		}
	}

	static getFeatures() {
		return Object.freeze({
			isFloatRead: this.getIsFloatRead(),
			isIntegerDivisionAccurate: this.getIsIntegerDivisionAccurate(),
			kernelMap: true
		});
	}

	static get testCanvas() {
		return testCanvas;
	}

	static get testContext() {
		return testContext;
	}

	static get testFunctionBuilder() {
		return testFunctionBuilder;
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