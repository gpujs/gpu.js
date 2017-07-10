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
	addFunction(functionName, jsFunction, paramTypes, returnType) {
		this.addFunctionNode(
			new CPUFunctionNode(functionName, jsFunction, paramTypes, returnType)
			.setAddFunction(this.addFunction.bind(this))
		);
	}

	/**
	 * @memberOf CPUFunctionBuilder#
	 * @function
	 * @name getPrototypeString
	 *
	 * @desc Return the JS Function String optimized for cpu.
	 *
	 * @param {String} functionName - Function name to trace from. If null, it returns the WHOLE builder stack
	 *
	 * @returns {String} Function String
	 *
	 */
	getPrototypeString() {
		let ret = '';
		for (let p in this.nodeMap) {
			if (!this.nodeMap.hasOwnProperty(p)) continue;
			const node = this.nodeMap[p];
			if (node.isSubKernel) {
				ret += `var ${ node.functionName } = ` + node.jsFunctionString.replace('return', `return ${ node.functionName }Result[this.thread.z][this.thread.y][this.thread.x] =`) + '.bind(this);\n';
			} else {
				ret += `var ${ node.functionName } = ${ node.jsFunctionString };\n`;
			}
		}
		return ret;
	}

	/**
	 * @memberOf CPUFunctionBuilder#
	 * @function
	 * @name addSubKernel
	 *
	 * @desc Add a new sub-kernel to the current kernel instance
	 *
	 * @param {Function} jsFunction - Sub-kernel function (JavaScript)
	 * @param {Array} paramNames - Parameters of the sub-kernel
	 * @param {Array} returnType - Return type of the subKernel
	 *
	 */
	addSubKernel(jsFunction, paramTypes, returnType) {
		const node = new CPUFunctionNode(null, jsFunction, paramTypes, returnType)
			.setAddFunction(this.addFunction.bind(this));
		node.isSubKernel = true;
		this.addFunctionNode(node);
	}
};