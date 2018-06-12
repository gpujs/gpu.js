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
   * @param {Function} funcParam - FunctionNode, that tracks compilation state
   *
   * @returns {Array} the append retArr
   */

	}, {
		key: 'astFunctionExpression',
		value: function astFunctionExpression(ast, retArr, funcParam) {

			// Setup function return type and name
			if (funcParam.isRootKernel) {
				retArr.push('void');
				funcParam.kernalAst = ast;
			} else {
				retArr.push(funcParam.returnType);
			}
			retArr.push(' ');
			retArr.push(funcParam.functionName);
			retArr.push('(');

			if (!funcParam.isRootKernel) {
				// Arguments handling
				for (var i = 0; i < funcParam.paramNames.length; ++i) {
					var paramName = funcParam.paramNames[i];

					if (i > 0) {
						retArr.push(', ');
					}
					var type = funcParam.getParamType(paramName);
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
				this.astGeneric(ast.body.body[_i], retArr, funcParam);
				retArr.push('\n');
			}

			// Function closing
			retArr.push('}\n');
			return retArr;
		}

		/**
   * @memberOf WebGL2FunctionNode#
   * @function
   * @name astVariableDeclaration
   *
   * @desc Parses the abstract syntax tree for *Variable Declaration*
   *
   * @param {Object} vardecNode - An ast Node
   * @param {Array} retArr - return array string
   * @param {Function} funcParam - FunctionNode, that tracks compilation state
   *
   * @returns {Array} the append retArr
   */

	}, {
		key: 'astVariableDeclaration',
		value: function astVariableDeclaration(vardecNode, retArr, funcParam) {
			for (var i = 0; i < vardecNode.declarations.length; i++) {
				var declaration = vardecNode.declarations[i];
				if (i > 0) {
					retArr.push(',');
				}
				var retDeclaration = [];
				this.astGeneric(declaration, retDeclaration, funcParam);
				if (i === 0) {
					if (retDeclaration[0] === 'get(' && funcParam.getParamType(retDeclaration[1]) === 'HTMLImage' && retDeclaration.length === 18) {
						retArr.push('sampler2D ');
					} else {
						retArr.push('float ');
					}
				}
				retArr.push.apply(retArr, retDeclaration);
			}
			retArr.push(';');
			return retArr;
		}

		/**
   * @memberOf WebGL2FunctionNode#
   * @function
   * @name astMemberExpression
   *
   * @desc Parses the abstract syntax tree for *Member* Expression
   *
   * @param {Object} mNode - An ast Node
   * @param {Array} retArr - return array string
   * @param {Function} funcParam - FunctionNode, that tracks compilation state
   *
   * @returns {Array} the append retArr
   */

	}, {
		key: 'astMemberExpression',
		value: function astMemberExpression(mNode, retArr, funcParam) {
			if (mNode.computed) {
				if (mNode.object.type === 'Identifier') {
					// Working logger
					var reqName = mNode.object.name;
					var funcName = funcParam.functionName || 'kernel';
					var assumeNotTexture = false;

					// Possibly an array request - handle it as such
					if (funcParam.paramNames) {
						var idx = funcParam.paramNames.indexOf(reqName);
						if (idx >= 0 && funcParam.paramTypes[idx] === 'float') {
							assumeNotTexture = true;
						}
					}

					if (assumeNotTexture) {
						// Get from array
						this.astGeneric(mNode.object, retArr, funcParam);
						retArr.push('[int(');
						this.astGeneric(mNode.property, retArr, funcParam);
						retArr.push(')]');
					} else {
						// Get from texture
						// This normally refers to the global read only input vars
						retArr.push('get(');
						this.astGeneric(mNode.object, retArr, funcParam);
						retArr.push(', vec2(');
						this.astGeneric(mNode.object, retArr, funcParam);
						retArr.push('Size[0],');
						this.astGeneric(mNode.object, retArr, funcParam);
						retArr.push('Size[1]), vec3(');
						this.astGeneric(mNode.object, retArr, funcParam);
						retArr.push('Dim[0],');
						this.astGeneric(mNode.object, retArr, funcParam);
						retArr.push('Dim[1],');
						this.astGeneric(mNode.object, retArr, funcParam);
						retArr.push('Dim[2]');
						retArr.push('), ');
						this.astGeneric(mNode.property, retArr, funcParam);
						retArr.push(')');
					}
				} else {
					this.astGeneric(mNode.object, retArr, funcParam);
					var last = retArr.pop();
					retArr.push(',');
					this.astGeneric(mNode.property, retArr, funcParam);
					retArr.push(last);
				}
			} else {

				// Unroll the member expression
				var unrolled = this.astMemberExpressionUnroll(mNode);
				var unrolled_lc = unrolled.toLowerCase();

				// Its a constant, remove this.constants.
				if (unrolled.indexOf(constantsPrefix) === 0) {
					unrolled = 'constants_' + unrolled.slice(constantsPrefix.length);
				}

				switch (unrolled_lc) {
					case 'this.thread.x':
						retArr.push('threadId.x');
						break;
					case 'this.thread.y':
						retArr.push('threadId.y');
						break;
					case 'this.thread.z':
						retArr.push('threadId.z');
						break;
					case 'this.output.x':
						retArr.push(this.output[0] + '.0');
						break;
					case 'this.output.y':
						retArr.push(this.output[1] + '.0');
						break;
					case 'this.output.z':
						retArr.push(this.output[2] + '.0');
						break;
					default:
						retArr.push(unrolled);
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