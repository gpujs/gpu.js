const RunnerBase = require('../runner-base');
const WebGLKernel = require('./kernel');
const utils = require('../../core/utils');
const WebGLFunctionBuilder = require('./function-builder');

/**
 * @class WebGLRunner
 *
 * Instantiates a Runner instance for the kernel.
 *
 * @extends RunnerBase
 *
 */
module.exports = class WebGLRunner extends RunnerBase {
	
	//
	// Constructor
	//
	
	/**
	 * @name WebGLRunner
	 *
	 * 	@param settings {Object}     Settings to instantiate properties in RunnerBase, with given values
	 *
	 */
	constructor(settings) {
		super(new WebGLFunctionBuilder(), settings);
		this.Kernel = WebGLKernel;
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
		return 'gpu';
	}
};