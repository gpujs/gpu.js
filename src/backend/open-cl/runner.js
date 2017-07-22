'use strict';

const RunnerBase = require('../runner-base');
const OpenCLKernel = require('./kernel');
const utils = require('../../core/utils');
const OpenCLFunctionBuilder = require('./function-builder');


module.exports = class OpenCLRunner extends RunnerBase {

	/**
	 * @constructor OpenCLRunner
	 *
 	 * @extends RunnerBase

 	 * @desc Instantiates a Runner instance for the kernel.
	 * 
	 * @param {Object} settings - Settings to instantiate properties in RunnerBase, with given values
	 *
	 */
	constructor(settings) {
		super(new OpenCLFunctionBuilder(), settings);
		this.Kernel = OpenCLKernel;
		this.kernel = null;
	}

	/**
	 * @memberOf OpenCLRunner#
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