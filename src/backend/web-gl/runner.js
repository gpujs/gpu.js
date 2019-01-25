'use strict';

const GLRunner = require('../gl-runner');
const WebGLKernel = require('./kernel');
const WebGLFunctionBuilder = require('./function-builder');
let isSupported = null;
let testCanvas = null;
let testContext = null;
let testExtensions = null;
let testFunctionBuilder = null;

class WebGLRunner extends GLRunner {
	static get FunctionBuilder() {
		return WebGLFunctionBuilder;
	}
	static get Kernel() {
		return WebGLKernel;
	}

	static get isSupported() {
		if (isSupported !== null) {
			return isSupported;
		}
		this.setupFeatureChecks();
		isSupported = this.isContextMatch(testContext);
		return isSupported;
	}

	static setupFeatureChecks() {
		if (typeof document !== 'undefined') {
			testCanvas = document.createElement('canvas');
		} else if (typeof OffscreenCanvas !== 'undefined') {
			testCanvas = new OffscreenCanvas(0, 0);
		}

		if (testCanvas) {
			testContext = testCanvas.getContext('webgl') || testCanvas.getContext('experimental-webgl');
			testExtensions = {
				OES_texture_float: testContext.getExtension('OES_texture_float'),
				OES_texture_float_linear: testContext.getExtension('OES_texture_float_linear'),
				OES_element_index_uint: testContext.getExtension('OES_element_index_uint'),
				WEBGL_draw_buffers: testContext.getExtension('WEBGL_draw_buffers'),
			};
			testFunctionBuilder = new this.FunctionBuilder();
		}
	}

	static isContextMatch(context) {
		if (typeof WebGLRenderingContext !== 'undefined') {
			return context instanceof WebGLRenderingContext;
		}
		return false;
	}

	static getFeatures() {
		this.setupFeatureChecks();
		const isDrawBuffers = this.getIsDrawBuffers();

		return Object.freeze({
			isFloatRead: this.getIsFloatRead(),
			isIntegerDivisionAccurate: this.getIsIntegerDivisionAccurate(),
			isTextureFloat: this.getIsTextureFloat(),
			isDrawBuffers: isDrawBuffers,
			kernelMap: true || isDrawBuffers
		});
	}

	static getIsTextureFloat() {
		return Boolean(testExtensions.OES_texture_float);
	}

	static getIsDrawBuffers() {
		return Boolean(testExtensions.WEBGL_draw_buffers);
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

module.exports = WebGLRunner;