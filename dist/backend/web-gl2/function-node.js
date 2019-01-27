'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var WebGLFunctionNode = require('../web-gl/function-node');
var DECODE32_ENCODE32 = /decode32\(\s+encode32\(/g;
var ENCODE32_DECODE32 = /encode32\(\s+decode32\(/g;

/**
 * @class WebGL2FunctionNode
 * @desc [INTERNAL] Takes in a function node, and does all the AST voodoo required to toString its respective webGL code.
 * @extends WebGLFunctionNode
 * @returns the converted webGL function string
 *
 */

var WebGL2FunctionNode = function (_WebGLFunctionNode) {
	_inherits(WebGL2FunctionNode, _WebGLFunctionNode);

	/**
  *
  * @param {string} fn
  * @param {object} [settings]
  */
	function WebGL2FunctionNode(fn, settings) {
		_classCallCheck(this, WebGL2FunctionNode);

		var _this = _possibleConstructorReturn(this, (WebGL2FunctionNode.__proto__ || Object.getPrototypeOf(WebGL2FunctionNode)).call(this, fn, settings));

		_this._string = null;
		return _this;
	}

	_createClass(WebGL2FunctionNode, [{
		key: 'toString',
		value: function toString() {
			if (this.prototypeOnly) {
				return this.astFunctionPrototype(this.getJsAST(), []).join('').trim();
			}
			if (this._string) return this._string;
			return this._string = webGlRegexOptimize(this.astGeneric(this.getJsAST(), []).join('').trim());
		}

		/**
   * @desc Parses the abstract syntax tree for *identifier* expression
   * @param {Object} idtNode - An ast Node
   * @param {Array} retArr - return array string
   * @returns {Array} the append retArr
   */

	}, {
		key: 'astIdentifierExpression',
		value: function astIdentifierExpression(idtNode, retArr) {
			if (idtNode.type !== 'Identifier') {
				throw this.astErrorOutput('IdentifierExpression - not an Identifier', idtNode);
			}

			// do we need to cast addressing vales to float?
			var castFloat = !this.isState('in-get-call-parameters');

			switch (idtNode.name) {
				case 'gpu_threadX':
					if (castFloat) {
						retArr.push('float(threadId.x)');
					} else {
						retArr.push('threadId.x');
					}
					break;
				case 'gpu_threadY':
					if (castFloat) {
						retArr.push('float(threadId.y)');
					} else {
						retArr.push('threadId.y');
					}
					break;
				case 'gpu_threadZ':
					if (castFloat) {
						retArr.push('float(threadId.z)');
					} else {
						retArr.push('threadId.z');
					}
					break;
				case 'gpu_outputX':
					retArr.push('uOutputDim.x');
					break;
				case 'gpu_outputY':
					retArr.push('uOutputDim.y');
					break;
				case 'gpu_outputZ':
					retArr.push('uOutputDim.z');
					break;
				case 'Infinity':
					retArr.push('intBitsToFloat(2139095039)');
					break;
				default:
					var userArgumentName = this.getUserArgumentName(idtNode.name);
					if (userArgumentName !== null) {
						this.pushParameter(retArr, userArgumentName);
					} else {
						this.pushParameter(retArr, idtNode.name);
					}
			}

			return retArr;
		}
	}]);

	return WebGL2FunctionNode;
}(WebGLFunctionNode);

/**
 * @desc [INTERNAL] Takes the near final webgl function string, and do regex search and replacements.
 * For voodoo optimize out the following:
 *
 * - decode32(encode32( <br>
 * - encode32(decode32( <br>
 *
 * @param {String} inStr - The webGl function String
 *
 */


function webGlRegexOptimize(inStr) {
	return inStr.replace(DECODE32_ENCODE32, '((').replace(ENCODE32_DECODE32, '((');
}

module.exports = WebGL2FunctionNode;