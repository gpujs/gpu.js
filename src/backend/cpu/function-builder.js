'use strict';

const FunctionBuilderBase = require('../function-builder-base');
const CPUFunctionNode = require('./function-node');

/**
 * @class CPUFunctionBuilder
 *
 * @extends FunctionBuilderBase
 *
 * @desc Builds functions to execute on CPU from JavaScript function Strings
 *
 */
module.exports = class CPUFunctionBuilder extends FunctionBuilderBase {
	constructor() {
		super();
		this.Node = CPUFunctionNode;
	}
};