const utils = require('../../core/utils');
const RunnerBase = require('../runner-base');
const CPUKernel = require('./kernel');
const CPUFunctionBuilder = require('./function-builder');

/**
 * @class CPURunner
 *
 * @extends RunnerBase
 *
 * Instantiates a Runner instance for the kernel.
 *
 */
module.exports = class CPURunner extends RunnerBase {
	
	//
	// Constructor
	//
	
	/**
	 * @name CPURunner
	 *
	 * @param settings {Object}     Settings to instantiate properties in RunnerBase, with given values
	 *
	 */
	constructor(settings) {
		super(new CPUFunctionBuilder(), settings);
		this.Kernel = CPUKernel;
		this.kernel = null;
	}

	/**
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