'use strict';

const FunctionBuilderBase = require('../function-builder-base');
const OpenCLFunctionNode = require('./function-node');
const utils = require('../../core/utils');

/**
 * @class OpenCLFunctionBuilder
 *
 * @extends FunctionBuilderBase
 *
 * @desc Builds openCl functions (shaders) from JavaScript function Strings
 *
 */
module.exports = class OpenCLFunctionBuilder extends FunctionBuilderBase {
	addFunction(functionName, jsFunction, paramTypes, returnType) {
		this.addFunctionNode(
			new OpenCLFunctionNode(functionName, jsFunction, paramTypes, returnType)
			.setAddFunction(this.addFunction.bind(this))
		);
	}

	/**
	 * @memberOf OpenCLFunctionBuilder#
	 * @function
	 * @name getStringFromFunctionNames
	 * 
	 * @desc Get the openCl string from function names
	 *
	 * @param {String[]} functionList - List of function to build the openCl string.
	 *
	 * @returns {String} The full openCL string, of all the various functions. Trace optimized if functionName given
	 *
	 */
	getStringFromFunctionNames(functionList) {
		const ret = [];
		for (let i = 0; i < functionList.length; ++i) {
			const node = this.nodeMap[functionList[i]];
			if (node) {
				ret.push(this.nodeMap[functionList[i]].getFunctionString());
			}
		}
		return ret.join('\n');
	}

	/**
	 * @memberOf OpenCLFunctionBuilder#
	 * @function
	 * @name getPrototypeStringFromFunctionNames
	 *
	 * @desc Return openCl String of all functions converted to openCl shader form
	 *
	 * @param {String[]} functionList - List of function names to build the openCl string.
	 * @param {Object} opt - Settings object passed to functionNode. See functionNode for more details.
	 *
	 * @returns {String} Prototype String of all functions converted to openCl shader form
	 *
	 */
	getPrototypeStringFromFunctionNames(functionList, opt) {
		const ret = [];
		for (let i = 0; i < functionList.length; ++i) {
			const node = this.nodeMap[functionList[i]];
			if (node) {
				ret.push(node.getFunctionPrototypeString(opt));
			}
		}
		return ret.join('\n');
	}

	/**
	 * @memberOf OpenCLFunctionBuilder#
	 * @function
	 * @name getString
	 *
	 * Get webGl string for a particular function name
	 * 
	 * @param {String} functionName - Function name to trace from. If null, it returns the WHOLE builder stack
	 *
	 * @returns {String} The full webGl string, of all the various functions. Trace optimized if functionName given
	 *
	 */
	getString(functionName, opt) {
		if (opt === undefined) {
			opt = {};
		}

		if (functionName) {
			return this.getStringFromFunctionNames(this.traceFunctionCalls(functionName, [], opt).reverse(), opt);
		}
		return this.getStringFromFunctionNames(Object.keys(this.nodeMap), opt);
	}

	/**
	 * @memberOf OpenCLFunctionBuilder#
	 * @name getPrototypeString
	 * @function
	 *
	 * @desc Return the webGl string for a function converted to glsl (webGl shaders)
	 *
	 * @param {String} functionName - Function name to trace from. If null, it returns the WHOLE builder stack
	 *
	 * @returns {String} The full webGl string, of all the various functions. Trace optimized if functionName given
	 *
	 */
	getPrototypeString(functionName) {
		this.rootKernel.generate();
		if (functionName) {
			return this.getPrototypeStringFromFunctionNames(this.traceFunctionCalls(functionName, []).reverse());
		}
		return this.getPrototypeStringFromFunctionNames(Object.keys(this.nodeMap));
	}

	/**
	 * @memberOf OpenCLFunctionBuilder#
	 * @function
	 * @name addKernel 
	 *
	 * @desc Add a new kernel to this instance
	 *
	 * @param {String} fnString - Kernel function as a String
	 * @param {Object} options - Settings object to set constants, debug mode, etc.
	 * @param {Array} paramNames - Parameters of the kernel
	 * @param {Array} paramTypes - Types of the parameters
	 *		
	 *
	 * @returns {Object} The inserted kernel as a Kernel Node
	 *
	 */
	addKernel(fnString, options, paramNames, paramTypes) {
		const kernelNode = new OpenCLFunctionNode('kernel', fnString, options, paramTypes);
		kernelNode.setAddFunction(this.addFunction.bind(this));
		kernelNode.paramNames = paramNames;
		kernelNode.paramTypes = paramTypes;
		kernelNode.isRootKernel = true;
		this.addFunctionNode(kernelNode);
		return kernelNode;
	}

	/**
	 * @memberOf OpenCLFunctionBuilder#
	 * @function
	 * @name addSubKernel
	 *
	 * @desc Add a new sub-kernel to the current kernel instance
	 *
	 * @param {Function} jsFunction - Sub-kernel function (JavaScript)
	 * @param {Object} options - Settings object to set constants, debug mode, etc.
	 * @param {Array} paramNames - Parameters of the sub-kernel
	 * @param {Array} returnType - Return type of the subKernel
	 *
	 * @returns {Object} The inserted sub-kernel as a Kernel Node
	 *
	 */
	addSubKernel(jsFunction, options, paramTypes, returnType) {
		const kernelNode = new OpenCLFunctionNode(null, jsFunction, options, paramTypes, returnType);
		kernelNode.setAddFunction(this.addFunction.bind(this));
		kernelNode.isSubKernel = true;
		this.addFunctionNode(kernelNode);
		return kernelNode;
	}

  polyfillStandardFunctions() {}
};