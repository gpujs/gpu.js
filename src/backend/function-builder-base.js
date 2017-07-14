'use strict';

module.exports = class FunctionBuilderBase {

	/**
	 * @constructor FunctionBuilderBase
	 *
	 * @desc This handles all the raw state, converted state, etc. of a single function.
	 * [INTERNAL] A collection of functionNodes.
	 * 
	 * @prop {Object} nodeMap - Object map, where nodeMap[function] = new FunctionNode;
	 * @prop {Object} gpu - The current gpu instance bound to this builder
	 * @prop {Object} rootKernel - The root kernel object, contains the paramNames, dimensions etc.
	 * 
	 */
	constructor(gpu) {
		this.nodeMap = {};
		this.gpu = gpu;
		this.rootKernel = null;
	}

	/**
	 * @memberOf FunctionBuilderBase#
	 * @function
	 * @name addFunction
	 *
	 * @desc Instantiates a FunctionNode, and add it to the nodeMap
	 *
	 * @param {String} functionName - Function name to assume, if its null, it attempts to extract from the function
	 * @param {Function} jsFunction - JS Function to do conversion
	 * @param {String[]|Object} paramTypes - Parameter type array, assumes all parameters are 'float' if null
	 * @param {String} returnType - The return type, assumes 'float' if null
	 *
	 */
	addFunction(functionName, jsFunction, paramTypes, returnType) {
		throw new Error('addFunction not supported on base');
	}

	/**
	 * @memberOf FunctionBuilderBase#
	 * @function
	 * @name addFunctionNode
	 *
	 * @desc Add the funciton node directly
	 *
	 * @param {functionNode} inNode - functionNode to add
	 *
	 */
	addFunctionNode(inNode) {
		this.nodeMap[inNode.functionName] = inNode;
		if (inNode.isRootKernel) {
			this.rootKernel = inNode;
		}
	}

	/**
	 * @memberOf FunctionBuilderBase#
	 * @function
	 * @name traceFunctionCalls
	 *
	 * @desc Trace all the depending functions being called, from a single function
	 *
	 * This allow for 'unneeded' functions to be automatically optimized out.
	 * Note that the 0-index, is the starting function trace.
	 *
	 * @param {String} functionName - Function name to trace from, default to 'kernel'
	 * @param {String[]} retList - Returning list of function names that is traced. Including itself.
	 *
	 * @returns {String[]}  Returning list of function names that is traced. Including itself.
	 */
	traceFunctionCalls(functionName, retList, parent) {
		functionName = functionName || 'kernel';
		retList = retList || [];

		const fNode = this.nodeMap[functionName];
		if (fNode) {
			// Check if function already exists
			if (retList.indexOf(functionName) >= 0) {
				// Does nothing if already traced
			} else {
				retList.push(functionName);
				fNode.parent = parent;
				fNode.getFunctionString(); //ensure JS trace is done
				for (let i = 0; i < fNode.calledFunctions.length; ++i) {
					this.traceFunctionCalls(fNode.calledFunctions[i], retList, fNode);
				}
			}
		}

		return retList;
	}




	//---------------------------------------------------------
	//
	//  Polyfill stuff
	//
	//---------------------------------------------------------

	// Round function used in polyfill
	static round(a) {
		return round(a);
	}

	/**
	 * @memberOf FunctionBuilderBase#
	 * @function
	 * @name polyfillStandardFunctions
	 *
	 * @desc Polyfill in the missing Math functions (round)
	 *
	 */
	polyfillStandardFunctions() {
		this.addFunction('round', round);
	}
};

function round(a) {
	return Math.floor(a + 0.5);
}