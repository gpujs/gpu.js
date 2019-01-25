const GLRunner = require('../gl-runner');
const WebGL2FunctionBuilder = require('./function-builder');
const WebGL2Kernel = require('./kernel');
let isSupported = null;
let testCanvas = null;
let testContext = null;
let testFunctionBuilder = null;
let testExtensions = null;

class WebGL2Runner extends GLRunner {
	static get FunctionBuilder() {
		return WebGL2FunctionBuilder;
	}

	static get Kernel() {
		return WebGL2Kernel;
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
			testContext = testCanvas.getContext('webgl2');
			testExtensions = {
				EXT_color_buffer_float: testContext.getExtension('EXT_color_buffer_float'),
				OES_texture_float_linear: testContext.getExtension('OES_texture_float_linear'),
			};
			testFunctionBuilder = new this.FunctionBuilder();
		}
	}

	static isContextMatch(context) {
		// from global
		if (typeof WebGL2RenderingContext !== 'undefined') {
			return context instanceof WebGL2RenderingContext;
		}
		return false;
	}

	static getFeatures() {
		return Object.freeze({
			isFloatRead: this.getIsFloatRead(),
			isIntegerDivisionAccurate: this.getIsIntegerDivisionAccurate(),
			kernelMap: true
		});
	}

	static getIsIntegerDivisionAccurate() {
		return super.getIsIntegerDivisionAccurate();
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

module.exports = WebGL2Runner;