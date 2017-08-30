'use strict';

const FunctionBuilderBase = require('../function-builder-base');
const WebGLFunctionNode = require('./function-node');

/**
 * @class WebGLFunctionBuilder
 *
 * @extends FunctionBuilderBase
 *
 * @desc Builds webGl functions (shaders) from JavaScript function Strings
 *
 */
module.exports = class WebGLFunctionBuilder extends FunctionBuilderBase {
	addFunction(functionName, jsFunction, paramTypes, returnType) {
		this.addFunctionNode(
			new WebGLFunctionNode(functionName, jsFunction, paramTypes, returnType)
			.setAddFunction(this.addFunction.bind(this))
		);
	}

	addNativeFunction(functionName, glslFunctionString) {
	  this.nativeFunctions[functionName] = glslFunctionString;
  }

	/**
	 * @memberOf WebGLFunctionBuilder#
	 * @function
	 * @name getStringFromFunctionNames
	 * 
	 * @desc Get the webGl string from function names
	 *
	 * @param {String[]} functionList - List of function to build the webgl string.
	 *
	 * @returns {String} The full webgl string, of all the various functions. Trace optimized if functionName given
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
	 * @memberOf WebGLFunctionBuilder#
	 * @function
	 * @name getPrototypeStringFromFunctionNames
	 *
	 * @desc Return webgl String of all functions converted to webgl shader form
	 *
	 * @param {String[]} functionList - List of function names to build the webgl string.
	 * @param {Object} opt - Settings object passed to functionNode. See functionNode for more details.
	 *
	 * @returns {String} Prototype String of all functions converted to webgl shader form
	 *
	 */
	getPrototypeStringFromFunctionNames(functionList, opt) {
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
		return ret.join('\n');
	}

	/**
	 * @memberOf WebGLFunctionBuilder#
	 * @function
	 * @name getString
	 *
	 * Get webGl string for a particular function name
	 * 
	 * @param {String} functionName - Function name to trace from. If null, it returns the WHOLE builder stack
	 *
	 * @returns {String} The full webgl string, of all the various functions. Trace optimized if functionName given
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
	 * @memberOf WebGLFunctionBuilder#
	 * @name getPrototypeString
	 * @function
	 *
	 * @desc Return the webgl string for a function converted to glsl (webgl shaders)
	 *
	 * @param {String} functionName - Function name to trace from. If null, it returns the WHOLE builder stack
	 *
	 * @returns {String} The full webgl string, of all the various functions. Trace optimized if functionName given
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
	 * @memberOf WebGLFunctionBuilder#
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
		const kernelNode = new WebGLFunctionNode('kernel', fnString, options, paramTypes);
		kernelNode.setAddFunction(this.addFunction.bind(this));
		kernelNode.paramNames = paramNames;
		kernelNode.paramTypes = paramTypes;
		kernelNode.isRootKernel = true;
		this.addFunctionNode(kernelNode);
		return kernelNode;
	}

	/**
	 * @memberOf WebGLFunctionBuilder#
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
		const kernelNode = new WebGLFunctionNode(null, jsFunction, options, paramTypes, returnType);
		kernelNode.setAddFunction(this.addFunction.bind(this));
		kernelNode.isSubKernel = true;
		this.addFunctionNode(kernelNode);
		return kernelNode;
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