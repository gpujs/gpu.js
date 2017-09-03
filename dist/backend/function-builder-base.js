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
  * @param {GPU} gpu - The GPU instance
  * @param {String} functionName - Function name to assume, if its null, it attempts to extract from the function
  * @param {Function} jsFunction - JS Function to do conversion
  * @param {String[]|Object} paramTypes - Parameter type array, assumes all parameters are 'float' if null
  * @param {String} returnType - The return type, assumes 'float' if null
  *
  */


	_createClass(FunctionBuilderBase, [{
		key: 'addFunction',
		value: function addFunction(functionName, jsFunction, paramTypes, returnType) {
			throw new Error('addFunction not supported on base');
		}
	}, {
		key: 'addFunctions',
		value: function addFunctions(functions) {
			if (functions) {
				if (Array.isArray(functions)) {
					for (var i = 0; i < functions.length; i++) {
						this.addFunction(null, functions[i]);
					}
				} else {
					for (var p in functions) {
						this.addFunction(p, functions[p]);
					}
				}
			}
		}
	}, {
		key: 'addNativeFunction',
		value: function addNativeFunction(name, nativeFunction) {
			throw new Error('addNativeFunction not supported on base');
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
   * @desc Add the funciton node directly
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
				if (retList.indexOf(functionName) >= 0) {
					// Does nothing if already traced
				} else {
					retList.push(functionName);
					if (parent) {
						fNode.parent = parent;
						fNode.constants = parent.constants;
					}
					fNode.getFunctionString(); //ensure JS trace is done
					for (var i = 0; i < fNode.calledFunctions.length; ++i) {
						this.traceFunctionCalls(fNode.calledFunctions[i], retList, fNode);
					}
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
	}, {
		key: 'polyfillStandardFunctions',
		value: function polyfillStandardFunctions() {
			throw new Error('polyfillStandardFunctions not defined on base function builder');
		}
	}]);

	return FunctionBuilderBase;
}();