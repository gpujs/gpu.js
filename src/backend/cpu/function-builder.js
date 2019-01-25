'use strict';

const FunctionBuilder = require('../function-builder');
const CPUFunctionNode = require('./function-node');

/**
 * @desc Builds functions to execute on CPU from JavaScript function Strings
 */
class CPUFunctionBuilder extends FunctionBuilder {
	static get FunctionNode() {
		return CPUFunctionNode;
	}
}

module.exports = CPUFunctionBuilder;