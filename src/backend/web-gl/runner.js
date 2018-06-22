'use strict';

const RunnerBase = require('../runner-base');
const WebGLKernel = require('./kernel');
const WebGLFunctionBuilder = require('./function-builder');


module.exports = class WebGLRunner extends RunnerBase {

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
		super(new WebGLFunctionBuilder(), settings);
		this.Kernel = WebGLKernel;
		this.kernel = null;
	}

	/**
	 * @memberOf WebGLRunner#
	 * @function
	 * @name getMode
	 *
	 * @desc Return the current mode in which gpu.js is executing.
	 * 
	 * @returns {String} The current mode; "cpu".
	 *
	 */
	getMode() {
		return 'gpu';
	}
};