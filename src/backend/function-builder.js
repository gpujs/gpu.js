'use strict';

/**
 * @desc This handles all the raw state, converted state, etc. of a single function.
 * [INTERNAL] A collection of functionNodes.
 *
 * @prop {Object} nodeMap - Object map, where nodeMap[function] = new FunctionNode;
 * @prop {Object} gpu - The current gpu instance bound to this builder
 * @prop {Object} rootKernel - The root kernel object, contains the paramNames, dimensions etc.
 *
 */
class FunctionBuilder {
	/**
	 *
	 * @returns FunctionNode
	 */
	static get FunctionNode() {
		throw new Error('"FunctionNode" not implemented on FunctionBuilder');
	}

	constructor() {
		this.nodeMap = {};
		this.nativeFunctions = {};
		this.rootKernel = null;
	}

	addNativeFunction(functionName, fnString) {
		this.nativeFunctions[functionName] = fnString;
	}

	/**
	 * @desc Instantiates a FunctionNode, and add it to the nodeMap
	 *
	 * @param {String} functionName - Function name to assume, if its null, it attempts to extract from the function
	 * @param {Function} fn - JS Function to do conversion
	 * @param {Object} [settings]
	 */
	addFunction(functionName, fn, settings) {
		this.addFunctionNode(
			new this.constructor.FunctionNode(functionName, fn, settings)
			.setBuilder(this)
		);
	}

	addFunctions(functions, settings) {
		if (functions) {
			if (Array.isArray(functions)) {
				for (let i = 0; i < functions.length; i++) {
					this.addFunction(null, functions[i], settings);
				}
			} else {
				for (let p in functions) {
					this.addFunction(p, functions[p], settings);
				}
			}
		}
	}

	addNativeFunctions(nativeFunctions) {
		for (let functionName in nativeFunctions) {
			if (!nativeFunctions.hasOwnProperty(functionName)) continue;
			this.addNativeFunction(functionName, nativeFunctions[functionName]);
		}
	}

	/**
	 * @desc Add the function node directly
	 *
	 * @param {FunctionNode} functionNode - functionNode to add
	 *
	 */
	addFunctionNode(functionNode) {
		this.nodeMap[functionNode.functionName] = functionNode;
		if (functionNode.isRootKernel) {
			this.rootKernel = functionNode;
		}
	}

	/**
	 * @desc Trace all the depending functions being called, from a single function
	 *
	 * This allow for 'unneeded' functions to be automatically optimized out.
	 * Note that the 0-index, is the starting function trace.
	 *
	 * @param {String} functionName - Function name to trace from, default to 'kernel'
	 * @param {String[]} [retList] - Returning list of function names that is traced. Including itself.
	 * @param {Object} [parent] - Parent node
	 *
	 * @returns {String[]}  Returning list of function names that is traced. Including itself.
	 */
	traceFunctionCalls(functionName, retList, parent) {
		functionName = functionName || 'kernel';
		retList = retList || [];

		const functionNode = this.nodeMap[functionName];
		if (functionNode) {
			// Check if function already exists
			const functionIndex = retList.indexOf(functionName);
			if (functionIndex === -1) {
				retList.push(functionName);
				if (parent) {
					functionNode.parent = parent;
				}
				functionNode.getFunctionString(); //ensure JS trace is done
				for (let i = 0; i < functionNode.calledFunctions.length; ++i) {
					this.traceFunctionCalls(functionNode.calledFunctions[i], retList, functionNode);
				}
			} else {
				/**
				 * https://github.com/gpujs/gpu.js/issues/207
				 * if dependent function is already in the list, because a function depends on it, and because it has
				 * already been traced, we know that we must move the dependent function to the end of the the retList.
				 * */
				const dependantFunctionName = retList.splice(functionIndex, 1)[0];
				retList.push(dependantFunctionName);
			}
		}

		if (this.nativeFunctions[functionName]) {
			if (retList.indexOf(functionName) >= 0) {
				// Does nothing if already traced
			} else {
				retList.push(functionName);
			}
		}

		return retList;
	}

	/**
	 * @desc Add a new kernel to this instance
	 *
	 * @param {String} fnString - Kernel function as a String
	 * @param {Object} settings - Settings object to set constants, debug mode, etc.
	 *
	 *
	 * @returns {Object} The inserted kernel as a Kernel Node
	 *
	 */
	addKernel(fnString, settings) {
		const kernelNode = new this.constructor.FunctionNode('kernel', fnString, settings);
		kernelNode.setBuilder(this);
		kernelNode.isRootKernel = true;
		this.addFunctionNode(kernelNode);
		return kernelNode;
	}

	/**
	 * @desc Add a new sub-kernel to the current kernel instance
	 *
	 * @param {Function} fn - Sub-kernel function (JavaScript)
	 * @param {Object} settings - Settings object to set constants, debug mode, etc.
	 *
	 * @returns {Object} The inserted sub-kernel as a Kernel Node
	 *
	 */
	addSubKernel(fn, settings) {
		const kernelNode = new this.constructor.FunctionNode(null, fn, settings);
		kernelNode.setBuilder(this);
		kernelNode.isSubKernel = true;
		this.addFunctionNode(kernelNode);
		return kernelNode;
	}

	/**
	 * @desc Return the string for a function
	 * @param {String} functionName - Function name to trace from. If null, it returns the WHOLE builder stack
	 * @returns {String} The full string, of all the various functions. Trace optimized if functionName given
	 */
	getPrototypeString(functionName) {
		return this.getPrototypes(functionName).join('\n');
	}

	/**
	 * @desc Return the string for a function
	 * @param {String} [functionName] - Function name to trace from. If null, it returns the WHOLE builder stack
	 * @returns {Array} The full string, of all the various functions. Trace optimized if functionName given
	 */
	getPrototypes(functionName) {
		this.rootKernel.generate();
		if (functionName) {
			return this.getPrototypesFromFunctionNames(this.traceFunctionCalls(functionName, []).reverse());
		}
		return this.getPrototypesFromFunctionNames(Object.keys(this.nodeMap));
	}


	/**
	 * @desc Get string from function names
	 * @param {String[]} functionList - List of function to build string
	 * @returns {String} The string, of all the various functions. Trace optimized if functionName given
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
	 * @desc Return string of all functions converted
	 * @param {String[]} functionList - List of function names to build the string.
	 * @param {Object} [opt - Settings object passed to functionNode. See functionNode for more details.
	 * @returns {Array} Prototypes of all functions converted
	 */
	getPrototypesFromFunctionNames(functionList, opt) {
		const ret = [];
		for (let i = 0; i < functionList.length; ++i) {
			const functionName = functionList[i];
			const node = this.nodeMap[functionName];
			if (node) {
				ret.push(node.getFunctionPrototypeString(opt));
			} else if (this.nativeFunctions[functionName]) {
				ret.push(this.nativeFunctions[functionName]);
			}
		}
		return ret;
	}

	/**
	 * @desc Return string of all functions converted
	 * @param {String[]} functionList - List of function names to build the string.
	 * @param {Object} opt - Settings object passed to functionNode. See functionNode for more details.
	 * @returns {String} Prototype string of all functions converted
	 */
	getPrototypeStringFromFunctionNames(functionList, opt) {
		return this.getPrototypesFromFunctionNames(functionList, opt).toString();
	}

	/**
	 * @desc Get string for a particular function name
	 * @param {String} functionName - Function name to trace from. If null, it returns the WHOLE builder stack
	 * @returns {String} settings - The string, of all the various functions. Trace optimized if functionName given
	 */
	getString(functionName) {
		if (functionName) {
			return this.getStringFromFunctionNames(this.traceFunctionCalls(functionName).reverse());
		}
		return this.getStringFromFunctionNames(Object.keys(this.nodeMap));
	}
}

module.exports = FunctionBuilder;