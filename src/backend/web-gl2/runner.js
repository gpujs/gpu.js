const utils = require('../../core/utils');
const GLRunner = require('../gl-runner');
const WebGL2FunctionBuilder = require('./function-builder');
const WebGL2Kernel = require('./kernel');
let isCompatible = null;

class WebGL2Runner extends GLRunner {
	static get isCompatible() {
		if (isCompatible !== null) {
			return isCompatible;
		}
		isCompatible = utils.isWebGl2Supported();
		return isCompatible;
	}

	static isRelatedContext(context) {
		// from global
		if (typeof WebGL2RenderingContext !== 'undefined') {
			return context instanceof WebGL2RenderingContext;
		}
		return false;
	}

	/**
	 * @desc Instantiates a Runner instance for the kernel.
	 * @param {Object} settings - Settings to instantiate properties in Runner, with given values
	 */
	constructor(settings) {
		super(new WebGL2FunctionBuilder(), settings);
		this.Kernel = WebGL2Kernel;
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

module.exports = WebGL2Runner;