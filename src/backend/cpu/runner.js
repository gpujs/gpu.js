'use strict';

const Runner = require('../runner');
const CPUKernel = require('./kernel');
const CPUFunctionBuilder = require('./function-builder');

class CPURunner extends Runner {
	static get isCompatible() {
		return true;
	}
	static isRelatedContext(context) {
		return false;
	}

	/**
	 * @desc Instantiates a Runner instance for the kernel.
	 * @param {Object} settings - Settings to instantiate properties in Runner, with given values
	 *
	 */
	constructor(settings) {
		super(new CPUFunctionBuilder(), settings);
		this.Kernel = CPUKernel;
		this.kernel = null;
	}

	/**
	 * @name getMode()
	 * @desc Return the current mode in which gpu.js is executing.
	 * @returns {String} The current mode; "cpu".
	 */
	getMode() {
		return 'cpu';
	}
}

module.exports = CPURunner;