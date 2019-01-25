'use strict';

const Runner = require('../runner');
const CPUKernel = require('./kernel');
const CPUFunctionBuilder = require('./function-builder');

class CPURunner extends Runner {
	static get FunctionBuilder() {
		return CPUFunctionBuilder;
	}
	static get Kernel() {
		return CPUKernel;
	}
	static getFeatures() {
		return Object.freeze({
			kernelMap: true,
			isIntegerDivisionAccurate: true
		});
	}
	static get isSupported() {
		return true;
	}
	static isContextMatch(context) {
		return false;
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