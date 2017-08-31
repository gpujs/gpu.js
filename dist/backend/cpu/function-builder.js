'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var FunctionBuilderBase = require('../function-builder-base');
var CPUFunctionNode = require('./function-node');

/**
 * @class CPUFunctionBuilder
 *
 * @extends FunctionBuilderBase
 *
 * @desc Builds functions to execute on CPU from JavaScript function Strings
 *
 */
module.exports = function (_FunctionBuilderBase) {
	_inherits(CPUFunctionBuilder, _FunctionBuilderBase);

	function CPUFunctionBuilder() {
		_classCallCheck(this, CPUFunctionBuilder);

		return _possibleConstructorReturn(this, (CPUFunctionBuilder.__proto__ || Object.getPrototypeOf(CPUFunctionBuilder)).apply(this, arguments));
	}

	_createClass(CPUFunctionBuilder, [{
		key: 'addFunction',
		value: function addFunction(functionName, jsFunction, paramTypes, returnType) {
			this.addFunctionNode(new CPUFunctionNode(functionName, jsFunction, paramTypes, returnType).setAddFunction(this.addFunction.bind(this)));
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

	}, {
		key: 'getPrototypeString',
		value: function getPrototypeString() {
			var ret = '';
			for (var p in this.nodeMap) {
				if (!this.nodeMap.hasOwnProperty(p)) continue;
				var node = this.nodeMap[p];
				if (node.isSubKernel) {
					ret += 'var ' + node.functionName + ' = ' + node.jsFunctionString.replace('return', 'return ' + node.functionName + 'Result[this.thread.z][this.thread.y][this.thread.x] =') + '.bind(this);\n';
				} else {
					ret += 'var ' + node.functionName + ' = ' + node.jsFunctionString + '.bind(this);\n';
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

	}, {
		key: 'addSubKernel',
		value: function addSubKernel(jsFunction, paramTypes, returnType) {
			var node = new CPUFunctionNode(null, jsFunction, paramTypes, returnType).setAddFunction(this.addFunction.bind(this));
			node.isSubKernel = true;
			this.addFunctionNode(node);
		}
	}, {
		key: 'polyfillStandardFunctions',
		value: function polyfillStandardFunctions() {}
	}]);

	return CPUFunctionBuilder;
}(FunctionBuilderBase);