'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var WebGLFunctionNode = require('../web-gl/function-node');

// Closure capture for the ast function, prevent collision with existing AST functions
// The prefixes to use
var constantsPrefix = 'this.constants.';

var DECODE32_ENCODE32 = /decode32\(\s+encode32\(/g;
var ENCODE32_DECODE32 = /encode32\(\s+decode32\(/g;

/** 
 * @class WebGL2FunctionNode
 *
 * @desc [INTERNAL] Takes in a function node, and does all the AST voodoo required to generate its respective webGL code.
 *
 * @extends WebGLFunctionNode
 *
 * @returns the converted webGL function string
 *
 */
module.exports = function (_WebGLFunctionNode) {
	_inherits(WebGL2FunctionNode, _WebGLFunctionNode);

	function WebGL2FunctionNode() {
		_classCallCheck(this, WebGL2FunctionNode);

		return _possibleConstructorReturn(this, (WebGL2FunctionNode.__proto__ || Object.getPrototypeOf(WebGL2FunctionNode)).apply(this, arguments));
	}

	_createClass(WebGL2FunctionNode, [{
		key: 'generate',
		value: function generate() {
			if (this.debug) {
				console.log(this);
			}
			if (this.prototypeOnly) {
				return WebGL2FunctionNode.astFunctionPrototype(this.getJsAST(), [], this).join('').trim();
			} else {
				this.functionStringArray = this.astGeneric(this.getJsAST(), [], this);
			}
			this.functionString = webGlRegexOptimize(this.functionStringArray.join('').trim());
			return this.functionString;
		}

		/**
   * @memberOf WebGL2FunctionNode#
   * @function
   * @name astFunctionExpression
   *
   * @desc Parses the abstract syntax tree for to its *named function*
   *
   * @param {Object} ast - the AST object to parse
   * @param {Array} retArr - return array string
   *
   * @returns {Array} the append retArr
   */

	}, {
		key: 'astFunctionExpression',
		value: function astFunctionExpression(ast, retArr) {

			// Setup function return type and name
			if (this.isRootKernel) {
				retArr.push('void');
				this.kernalAst = ast;
			} else {
				retArr.push(this.returnType);
			}
			retArr.push(' ');
			retArr.push(this.functionName);
			retArr.push('(');

			if (!this.isRootKernel) {
				// Arguments handling
				for (var i = 0; i < this.paramNames.length; ++i) {
					var paramName = this.paramNames[i];

					if (i > 0) {
						retArr.push(', ');
					}
					var type = this.getParamType(paramName);
					switch (type) {
						case 'Texture':
						case 'Input':
						case 'Array':
						case 'HTMLImage':
							retArr.push('sampler2D');
							break;
						default:
							retArr.push('float');
					}

					retArr.push(' ');
					retArr.push('user_');
					retArr.push(paramName);
				}
			}

			// Function opening
			retArr.push(') {\n');

			// Body statement iteration
			for (var _i = 0; _i < ast.body.body.length; ++_i) {
				this.astGeneric(ast.body.body[_i], retArr);
				retArr.push('\n');
			}

			// Function closing
			retArr.push('}\n');
			return retArr;
		}

		/**
   * @memberOf WebGL2FunctionNode#
   * @function
   * @name astIdentifierExpression
   *
   * @desc Parses the abstract syntax tree for *identifier* expression
   *
   * @param {Object} idtNode - An ast Node
   * @param {Array} retArr - return array string
   *
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
					castFloat && retArr.push('float(');
					retArr.push('threadId.x');
					castFloat && retArr.push(')');
					break;
				case 'gpu_threadY':
					castFloat && retArr.push('float(');
					retArr.push('threadId.y');
					castFloat && retArr.push(')');
					break;
				case 'gpu_threadZ':
					castFloat && retArr.push('float(');
					retArr.push('threadId.z');
					castFloat && retArr.push(')');
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
					if (this.constants && this.constants.hasOwnProperty(idtNode.name)) {
						this.pushParameter(retArr, 'constants_' + idtNode.name);
					} else {
						var userParamName = this.getUserParamName(idtNode.name);
						if (userParamName !== null) {
							this.pushParameter(retArr, 'user_' + userParamName);
						} else {
							this.pushParameter(retArr, 'user_' + idtNode.name);
						}
					}
			}

			return retArr;
		}
	}]);

	return WebGL2FunctionNode;
}(WebGLFunctionNode);

/**
 * @ignore
 * @function
 * @name webgl_regex_optimize
 *
 * @desc [INTERNAL] Takes the near final webgl function string, and do regex search and replacments.
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