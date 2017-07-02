const RunnerBase = require('../runner-base');
const WebGLKernel = require('./kernel');
const utils = require('../../core/utils');
const WebGLFunctionBuilder = require('./function-builder');

/**
 * Class: WebGLRunner
 *
 * Instantiates a Runner instance for the kernel.
 *
 * Extends: 
 *		RunnerBase
 *
 */
module.exports = class WebGLRunner extends RunnerBase {
	
	//
	// Constructor
	//
	
	/**
	 * Function: WebGLRunner
	 *
	 * Parameters:
	 * 	settings         - {Object}     Settings to instantiate properties in RunnerBase, with given values
	 *
	 */
	constructor(settings) {
		super(new WebGLFunctionBuilder(), settings);
		this.Kernel = WebGLKernel;
		this.kernel = null;
	}

	/**
	 * Function: getMode()
	 *
	 * Return the current mode in which gpu.js is executing.
	 * 
	 * Returns:
	 * 	{String} The current mode; "cpu".
	 *
	 */
	getMode() {
		return 'gpu';
	}
};