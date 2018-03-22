const WebGLRunner = require('../web-gl/runner');
const WebGL2FunctionBuilder = require('./function-builder');
const WebGL2Kernel = require('./kernel');

module.exports = class WebGL2Runner extends WebGLRunner {
	/**
	 * @constructor WebGLRunner
	 *
	 * @extends RunnerBase

	 * @desc Instantiates a Runner instance for the kernel.
	 *
	 * @param {Object} settings - Settings to instantiate properties in RunnerBase, with given values
	 *
	 */
	constructor(settings) {
		super(new WebGL2FunctionBuilder(), settings);
		this.Kernel = WebGL2Kernel;
		this.kernel = null;
	}
};