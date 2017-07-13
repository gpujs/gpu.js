'use strict';

const utils = require('../../core/utils');
const RunnerBase = require('../runner-base');
const CPUKernel = require('./kernel');
const CPUFunctionBuilder = require('./function-builder');

module.exports = class CPURunner extends RunnerBase {

	/**
	 * @constructor CPURunner
	 *
	 * @desc Instantiates a Runner instance for the kernel.
	 * 
	 * @extends RunnerBase
	 *
	 * @param {Object} settings - Settings to instantiate properties in RunnerBase, with given values
	 *
	 */

	constructor(settings) {
		super(new CPUFunctionBuilder(), settings);
		this.Kernel = CPUKernel;
		this.kernel = null;
	}

	/**
	 * @memberOf CPURunner#
	 * @function
	 * @name getMode()
	 *
	 * Return the current mode in which gpu.js is executing.
	 * 
	 * @returns {String} The current mode; "cpu".
	 *
	 */
	getMode() {
		return 'cpu';
	}
};