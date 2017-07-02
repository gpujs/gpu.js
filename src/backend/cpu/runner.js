const utils = require('../../core/utils');
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
	
	//
	// Constructor
	//
	
	///
	/// Function: CPURunner
	///
	/// Parameters:
	/// 	settings         - {Object}     Settings to instantiate properties in RunnerBase, with given values
	///
	constructor(settings) {
		super(new CPUFunctionBuilder(), settings);
		this.Kernel = CPUKernel;
		this.kernel = null;
	}

	///
	/// Function: get mode()
	///
	/// [GETTER] Return the current mode in which gpu.js is executing.
	/// 
	/// Returns:
	/// 	{String} The current mode; "cpu".
	///
	get mode() {
		return 'cpu';
	}
};