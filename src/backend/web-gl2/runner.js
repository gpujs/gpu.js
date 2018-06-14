const RunnerBase = require('../runner-base');
const WebGL2FunctionBuilder = require('./function-builder');
const WebGL2Kernel = require('./kernel');

module.exports = class WebGL2Runner extends RunnerBase {
	/**
	 * @constructor WebGL2Runner
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

	/**
	 * @memberOf WebGL2Runner#
	 * @function
	 * @name getMode
	 *
	 * @desc Return the current mode in which gpu.js is executing.
	 *
	 * @returns {String} The current mode; "gpu".
	 *
	 */
	getMode() {
		return 'gpu';
	}
};