'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

module.exports = function () {

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
	function FunctionBuilderBase(gpu) {
		_classCallCheck(this, FunctionBuilderBase);

		this.nodeMap = {};
		this.nativeFunctions = {};
		this.nativeVariables = {};
		this.gpu = gpu;
		this.rootKernel = null;
		this.Node = null;
	}

	_createClass(FunctionBuilderBase, [{
		key: 'addNativeFunction',
		value: function addNativeFunction(functionName, glslFunctionString) {
			this.nativeFunctions[functionName] = glslFunctionString;
		}
	}, {
		key: 'addNativeVariable',
		value: function addNativeVariable(variableName, variable) {
			this.nativeVariables[variableName] = variable;
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
   * @param {String[]|Object} [paramTypes] - Parameter type array, assumes all parameters are 'float' if falsey
   * @param {String} [returnType] - The return type, assumes 'float' if falsey
   *
   */

	}, {
		key: 'addFunction',
		value: function addFunction(functionName, jsFunction, options, paramTypes, returnType) {
			this.addFunctionNode(new this.Node(functionName, jsFunction, options, paramTypes, returnType).setAddFunction(this.addFunction.bind(this)));
		}
	}, {
		key: 'addFunctions',
		value: function addFunctions(functions, options) {
			if (functions) {
				if (Array.isArray(functions)) {
					for (var i = 0; i < functions.length; i++) {
						this.addFunction(null, functions[i], options);
					}
				} else {
					for (var p in functions) {
						this.addFunction(p, functions[p], options);
					}
				}
			}
		}
	}, {
		key: 'addNativeFunctions',
		value: function addNativeFunctions(nativeFunctions) {
			for (var functionName in nativeFunctions) {
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

	}, {
		key: 'addFunctionNode',
		value: function addFunctionNode(inNode) {
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

	}, {
		key: 'traceFunctionCalls',
		value: function traceFunctionCalls(functionName, retList, parent) {
			functionName = functionName || 'kernel';
			retList = retList || [];
			var fNode = this.nodeMap[functionName];
			if (fNode) {
				// Check if function already exists
				var functionIndex = retList.indexOf(functionName);
				if (functionIndex === -1) {
					retList.push(functionName);
					if (parent) {
						fNode.parent = parent;
					}
					fNode.getFunctionString(); //ensure JS trace is done
					for (var i = 0; i < fNode.calledFunctions.length; ++i) {
						this.traceFunctionCalls(fNode.calledFunctions[i], retList, fNode);
					}
				} else {
					/**
      * https://github.com/gpujs/gpu.js/issues/207
      * if dependent function is already in the list, because a function depends on it, and because it has
      * already been traced, we know that we must move the dependent function to the end of the the retList.
      * */
					var dependantFunctionName = retList.splice(functionIndex, 1)[0];
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
   * @param {Array} paramNames - Parameters of the kernel
   * @param {Array} paramTypes - Types of the parameters
   *
   *
   * @returns {Object} The inserted kernel as a Kernel Node
   *
   */

	}, {
		key: 'addKernel',
		value: function addKernel(fnString, options, paramNames, paramTypes) {
			var kernelNode = new this.Node('kernel', fnString, options, paramTypes);
			kernelNode.setAddFunction(this.addFunction.bind(this));
			kernelNode.paramNames = paramNames;
			kernelNode.paramTypes = paramTypes;
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
   * @param {Array} paramNames - Parameters of the sub-kernel
   * @param {Array} returnType - Return type of the subKernel
   *
   * @returns {Object} The inserted sub-kernel as a Kernel Node
   *
   */

	}, {
		key: 'addSubKernel',
		value: function addSubKernel(jsFunction, options, paramTypes, returnType) {
			var kernelNode = new this.Node(null, jsFunction, options, paramTypes, returnType);
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

	}, {
		key: 'getPrototypeString',
		value: function getPrototypeString(functionName) {
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

	}, {
		key: 'getPrototypes',
		value: function getPrototypes(functionName) {
			this.rootKernel.generate();
			if (functionName) {
				return this.getPrototypesFromFunctionNames(this.traceFunctionCalls(functionName, []).reverse());
			}
			return this.getPrototypesFromFunctionNames(Object.keys(this.nodeMap));
		}
	}, {
		key: 'getStringFromNativeVariables',
		value: function getStringFromNativeVariables() {
			var variabels = this.nativeVariables;
			var result = [];
			for (var p in variabels) {
				result.push(variabels[p].getDeclarationString());
			}
			return result.join('\n');
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

	}, {
		key: 'getStringFromFunctionNames',
		value: function getStringFromFunctionNames(functionList) {
			var ret = [];
			for (var i = 0; i < functionList.length; ++i) {
				var node = this.nodeMap[functionList[i]];
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

	}, {
		key: 'getPrototypesFromFunctionNames',
		value: function getPrototypesFromFunctionNames(functionList, opt) {
			var ret = [];
			for (var i = 0; i < functionList.length; ++i) {
				var functionName = functionList[i];
				var node = this.nodeMap[functionName];
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

	}, {
		key: 'getPrototypeStringFromFunctionNames',
		value: function getPrototypeStringFromFunctionNames(functionList, opt) {
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

	}, {
		key: 'getString',
		value: function getString(functionName, opt) {
			if (opt === undefined) {
				opt = {};
			}

			if (functionName) {
				return this.getStringFromNativeVariables() + this.getStringFromFunctionNames(this.traceFunctionCalls(functionName, [], opt).reverse(), opt);
			}
			return this.getStringFromNativeVariables() + this.getStringFromFunctionNames(Object.keys(this.nodeMap), opt);
		}
	}]);

	return FunctionBuilderBase;
}();