'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var FunctionBuilderBase = require('../function-builder-base');
var WebGLFunctionNode = require('./function-node');

/**
 * @class WebGLFunctionBuilder
 *
 * @extends FunctionBuilderBase
 *
 * @desc Builds webGl functions (shaders) from JavaScript function Strings
 *
 */
module.exports = function (_FunctionBuilderBase) {
	_inherits(WebGLFunctionBuilder, _FunctionBuilderBase);

	function WebGLFunctionBuilder() {
		_classCallCheck(this, WebGLFunctionBuilder);

		return _possibleConstructorReturn(this, (WebGLFunctionBuilder.__proto__ || Object.getPrototypeOf(WebGLFunctionBuilder)).apply(this, arguments));
	}

	_createClass(WebGLFunctionBuilder, [{
		key: 'addFunction',
		value: function addFunction(functionName, jsFunction, paramTypes, returnType) {
			this.addFunctionNode(new WebGLFunctionNode(functionName, jsFunction, paramTypes, returnType).setAddFunction(this.addFunction.bind(this)));
		}
	}, {
		key: 'addNativeFunction',
		value: function addNativeFunction(functionName, glslFunctionString) {
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

	}, {
		key: 'getPrototypeStringFromFunctionNames',
		value: function getPrototypeStringFromFunctionNames(functionList, opt) {
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

	}, {
		key: 'getString',
		value: function getString(functionName, opt) {
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

	}, {
		key: 'getPrototypeString',
		value: function getPrototypeString(functionName) {
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

	}, {
		key: 'addKernel',
		value: function addKernel(fnString, options, paramNames, paramTypes) {
			var kernelNode = new WebGLFunctionNode('kernel', fnString, options, paramTypes);
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

	}, {
		key: 'addSubKernel',
		value: function addSubKernel(jsFunction, options, paramTypes, returnType) {
			var kernelNode = new WebGLFunctionNode(null, jsFunction, options, paramTypes, returnType);
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

	}, {
		key: 'polyfillStandardFunctions',


		/**
   * @memberOf FunctionBuilderBase#
   * @function
   * @name polyfillStandardFunctions
   *
   * @desc Polyfill in the missing Math functions (round)
   *
   */
		value: function polyfillStandardFunctions() {
			this.addFunction('round', _round);
		}
	}], [{
		key: 'round',
		value: function round(a) {
			return _round(a);
		}
	}]);

	return WebGLFunctionBuilder;
}(FunctionBuilderBase);

function _round(a) {
	return Math.floor(a + 0.5);
}