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
		this.nativeFunctions = {};
		this.gpu = gpu;
		this.rootKernel = null;
		this.Node = null;
	}

	addNativeFunction(functionName, glslFunctionString) {
		this.nativeFunctions[functionName] = glslFunctionString;
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
	 * @param {Object} [options]
	 *
	 */
	addFunction(functionName, jsFunction, options) {
		this.addFunctionNode(
			new this.Node(functionName, jsFunction, options)
			.setAddFunction(this.addFunction.bind(this))
		);
	}

	addFunctions(functions, options) {
		if (functions) {
			if (Array.isArray(functions)) {
				for (let i = 0; i < functions.length; i++) {
					this.addFunction(null, functions[i], options);
				}
			} else {
				for (let p in functions) {
					this.addFunction(p, functions[p], options);
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
	 * @memberOf FunctionBuilderBase#
	 * @function
	 * @name addFunctionNode
	 *
	 * @desc Add the function node directly
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
	 * @param {Object} [parent] - Parent node
	 *
	 * @returns {String[]}  Returning list of function names that is traced. Including itself.
	 */
	traceFunctionCalls(functionName, retList, parent) {
		functionName = functionName || 'kernel';
		retList = retList || [];

		const fNode = this.nodeMap[functionName];
		if (fNode) {
			// Check if function already exists
			const functionIndex = retList.indexOf(functionName);
			if (functionIndex === -1) {
				retList.push(functionName);
				if (parent) {
					fNode.parent = parent;
				}
				fNode.getFunctionString(); //ensure JS trace is done
				for (let i = 0; i < fNode.calledFunctions.length; ++i) {
					this.traceFunctionCalls(fNode.calledFunctions[i], retList, fNode);
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
	 * @memberOf FunctionBuilderBase#
	 * @function
	 * @name addKernel
	 *
	 * @desc Add a new kernel to this instance
	 *
	 * @param {String} fnString - Kernel function as a String
	 * @param {Object} options - Settings object to set constants, debug mode, etc.
	 *
	 *
	 * @returns {Object} The inserted kernel as a Kernel Node
	 *
	 */
	addKernel(fnString, options) {
		const kernelNode = new this.Node('kernel', fnString, options);
		kernelNode.setAddFunction(this.addFunction.bind(this));
		kernelNode.isRootKernel = true;
		this.addFunctionNode(kernelNode);
		return kernelNode;
	}

	/**
	 * @memberOf FunctionBuilderBase#
	 * @function
	 * @name addSubKernel
	 *
	 * @desc Add a new sub-kernel to the current kernel instance
	 *
	 * @param {Function} jsFunction - Sub-kernel function (JavaScript)
	 * @param {Object} options - Settings object to set constants, debug mode, etc.
	 *
	 * @returns {Object} The inserted sub-kernel as a Kernel Node
	 *
	 */
	addSubKernel(jsFunction, options) {
		const kernelNode = new this.Node(null, jsFunction, options);
		kernelNode.setAddFunction(this.addFunction.bind(this));
		kernelNode.isSubKernel = true;
		this.addFunctionNode(kernelNode);
		return kernelNode;
	}

	/**
	 * @memberOf CPUFunctionBuilder#
	 * @name getPrototypeString
	 * @function
	 *
	 * @desc Return the string for a function
	 *
	 * @param {String} functionName - Function name to trace from. If null, it returns the WHOLE builder stack
	 *
	 * @returns {String} The full string, of all the various functions. Trace optimized if functionName given
	 *
	 */
	getPrototypeString(functionName) {
		return this.getPrototypes(functionName).join('\n');
	}

	/**
	 * @memberOf CPUFunctionBuilder#
	 * @name getPrototypeString
	 * @function
	 *
	 * @desc Return the string for a function
	 *
	 * @param {String} [functionName] - Function name to trace from. If null, it returns the WHOLE builder stack
	 *
	 * @returns {Array} The full string, of all the various functions. Trace optimized if functionName given
	 *
	 */
	getPrototypes(functionName) {
		this.rootKernel.generate();
		if (functionName) {
			return this.getPrototypesFromFunctionNames(this.traceFunctionCalls(functionName, []).reverse());
		}
		return this.getPrototypesFromFunctionNames(Object.keys(this.nodeMap));
	}


	/**
	 * @memberOf FunctionBuilderBase#
	 * @function
	 * @name getStringFromFunctionNames
	 *
	 * @desc Get string from function names
	 *
	 * @param {String[]} functionList - List of function to build string
	 *
	 * @returns {String} The string, of all the various functions. Trace optimized if functionName given
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
	 * @memberOf FunctionBuilderBase#
	 * @function
	 * @name getPrototypeStringFromFunctionNames
	 *
	 * @desc Return string of all functions converted
	 *
	 * @param {String[]} functionList - List of function names to build the string.
	 * @param {Object} [opt - Settings object passed to functionNode. See functionNode for more details.
	 *
	 * @returns {Array} Prototypes of all functions converted
	 *
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
	 * @memberOf FunctionBuilderBase#
	 * @function
	 * @name getPrototypeStringFromFunctionNames
	 *
	 * @desc Return string of all functions converted
	 *
	 * @param {String[]} functionList - List of function names to build the string.
	 * @param {Object} opt - Settings object passed to functionNode. See functionNode for more details.
	 *
	 * @returns {String} Prototype string of all functions converted
	 *
	 */
	getPrototypeStringFromFunctionNames(functionList, opt) {
		return this.getPrototypesFromFunctionNames(functionList, opt).toString();
	}

	/**
	 * @memberOf FunctionBuilderBase#
	 * @function
	 * @name getString
	 *
	 * Get string for a particular function name
	 *
	 * @param {String} functionName - Function name to trace from. If null, it returns the WHOLE builder stack
	 *
	 * @returns {String} The string, of all the various functions. Trace optimized if functionName given
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
};