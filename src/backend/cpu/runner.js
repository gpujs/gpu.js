const utils = require('../../utils');
const RunnerBase = require('../runner-base');
const CPUKernel = require('./kernel');
const CPUFunctionBuilder = require('./function-builder');

///
/// Class: CPURunner
///
/// Extends: RunnerBase
///
/// Instantiates a Runner instance for the kernel.
///
module.exports = class CPURunner extends RunnerBase {
	constructor(settings) {
		super(new CPUFunctionBuilder(), settings);
		this.Kernel = CPUKernel;
		this.kernel = null;
	}

	get mode() {
		return 'cpu';
	}
};