'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var FunctionNodeBase = require('../function-node-base');
var utils = require('../../core/utils');
// Closure capture for the ast function, prevent collision with existing AST functions
// The prefixes to use
var jsMathPrefix = 'Math.';
var localPrefix = 'this.';
var constantsPrefix = 'this.constants.';

var DECODE32_ENCODE32 = /decode32\(\s+encode32\(/g;
var ENCODE32_DECODE32 = /encode32\(\s+decode32\(/g;

// these debugs were hugely usefull...
// TODO: optimise out - webpack/babel options? maybe some generic logging support in core/utils?
// const debugLog = console.log
var debugLog = function debugLog() {};
/**
 * @class WebGLFunctionNode
 *
 * @desc [INTERNAL] Takes in a function node, and does all the AST voodoo required to generate its respective webGL code.
 *
 * @extends FunctionNodeBase
 *
 * @param {functionNode} inNode - The function node object
 *
 * @returns the converted webGL function string
 *
 */
module.exports = function (_FunctionNodeBase) {
	_inherits(WebGLFunctionNode, _FunctionNodeBase);

	function WebGLFunctionNode() {
		_classCallCheck(this, WebGLFunctionNode);

		return _possibleConstructorReturn(this, (WebGLFunctionNode.__proto__ || Object.getPrototypeOf(WebGLFunctionNode)).apply(this, arguments));
	}

	_createClass(WebGLFunctionNode, [{
		key: 'generate',
		value: function generate() {
			if (this.debug) {
				debugLog(this);
			}
			if (this.prototypeOnly) {
				return WebGLFunctionNode.astFunctionPrototype(this.getJsAST(), [], this).join('').trim();
			} else {
				this.functionStringArray = this.astGeneric(this.getJsAST(), [], this);
			}
			this.functionString = webGlRegexOptimize(this.functionStringArray.join('').trim());
			return this.functionString;
		}

		/**
   * @memberOf WebGLFunctionNode#
   * @function
   * @name astFunctionDeclaration
   *
   * @desc Parses the abstract syntax tree for to its *named function declaration*
   *
   * @param {Object} ast - the AST object to parse
   * @param {Array} retArr - return array string
   *
   * @returns {Array} the append retArr
   */

	}, {
		key: 'astFunctionDeclaration',
		value: function astFunctionDeclaration(ast, retArr) {
			if (this.addFunction) {
				this.addFunction(null, utils.getAstString(this.jsFunctionString, ast));
			}
			return retArr;
		}

		/**
   * @memberOf WebGLFunctionNode#
   * @function
   * @name astFunctionPrototype
   * @static
   *
   * @desc Parses the abstract syntax tree for to its *named function prototype*
   *
   * @param {Object} ast - the AST object to parse
   * @param {Array} retArr - return array string
   *
   * @returns {Array} the append retArr
   */

	}, {
		key: 'astFunctionExpression',


		/**
   * @memberOf WebGLFunctionNode#
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
   * @memberOf WebGLFunctionNode#
   * @function
   * @name astReturnStatement
   *
   * @desc Parses the abstract syntax tree for to *return* statement
   *
   * @param {Object} ast - the AST object to parse
   * @param {Array} retArr - return array string
   *
   * @returns {Array} the append retArr
   */

	}, {
		key: 'astReturnStatement',
		value: function astReturnStatement(ast, retArr) {
			if (this.isRootKernel) {
				retArr.push('kernelResult = ');
				this.astGeneric(ast.argument, retArr);
				retArr.push(';');
				retArr.push('return;');
			} else if (this.isSubKernel) {
				retArr.push(this.functionName + 'Result = ');
				this.astGeneric(ast.argument, retArr);
				retArr.push(';');
				retArr.push('return ' + this.functionName + 'Result;');
			} else {
				retArr.push('return ');
				this.astGeneric(ast.argument, retArr);
				retArr.push(';');
			}

			//throw this.astErrorOutput(
			//	'Non main function return, is not supported : '+this.currentFunctionNamespace,
			//	ast
			//);

			return retArr;
		}

		/**
   * @memberOf WebGLFunctionNode#
   * @function
   * @name astLiteral
   *
   * @desc Parses the abstract syntax tree for *literal value*
   *
   * @param {Object} ast - the AST object to parse
   * @param {Array} retArr - return array string
   *
   * @returns {Array} the append retArr
   */

	}, {
		key: 'astLiteral',
		value: function astLiteral(ast, retArr) {

			// Reject non numeric literals
			if (isNaN(ast.value)) {
				throw this.astErrorOutput('Non-numeric literal not supported : ' + ast.value, ast);
			}

			// Push the literal value as a float/int
			retArr.push(ast.value);

			var inGetParams = this.isState('in-get-call-parameters');
			// If it was an int, node made a float if necessary
			if (Number.isInteger(ast.value)) {
				if (!inGetParams) {
					retArr.push('.0');
				}
			} else if (inGetParams) {
				// or cast to an int as we are addressing an input array
				retArr.pop();
				retArr.push('int(');
				retArr.push(ast.value);
				retArr.push(')');
			}

			return retArr;
		}

		/**
   * @memberOf WebGLFunctionNode#
   * @function
   * @name astBinaryExpression
   *
   * @desc Parses the abstract syntax tree for *binary* expression
   *
   * @param {Object} ast - the AST object to parse
   * @param {Array} retArr - return array string
   *
   * @returns {Array} the append retArr
   */

	}, {
		key: 'astBinaryExpression',
		value: function astBinaryExpression(ast, retArr) {
			var inGetParams = this.isState('in-get-call-parameters');
			if (inGetParams) {
				this.pushState('not-in-get-call-parameters');
				retArr.push('int');
			}
			retArr.push('(');

			if (ast.operator === '%') {
				retArr.push('mod(');
				this.astGeneric(ast.left, retArr);
				retArr.push(',');
				this.astGeneric(ast.right, retArr);
				retArr.push(')');
			} else if (ast.operator === '===') {
				this.astGeneric(ast.left, retArr);
				retArr.push('==');
				this.astGeneric(ast.right, retArr);
			} else if (ast.operator === '!==') {
				this.astGeneric(ast.left, retArr);
				retArr.push('!=');
				this.astGeneric(ast.right, retArr);
			} else if (this.fixIntegerDivisionAccuracy && ast.operator === '/') {
				retArr.push('div_with_int_check(');
				this.astGeneric(ast.left, retArr);
				retArr.push(', ');
				this.astGeneric(ast.right, retArr);
				retArr.push(')');
			} else {
				this.astGeneric(ast.left, retArr);
				retArr.push(ast.operator);
				this.astGeneric(ast.right, retArr);
			}

			retArr.push(')');

			if (inGetParams) {
				this.popState('not-in-get-call-parameters');
			}

			return retArr;
		}

		/**
   * @memberOf WebGLFunctionNode#
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
					// https://stackoverflow.com/a/47543127/1324039
					retArr.push('3.402823466e+38');
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

		/**
   * @memberOf WebGLFunctionNode#
   * @function
   * @name astForStatement
   *
   * @desc Parses the abstract syntax tree forfor *for-loop* expression
   *
   * @param {Object} forNode - An ast Node
   * @param {Array} retArr - return array string
   *
   * @returns {Array} the parsed webgl string
   */

	}, {
		key: 'astForStatement',
		value: function astForStatement(forNode, retArr) {
			if (forNode.type !== 'ForStatement') {
				throw this.astErrorOutput('Invalid for statment', forNode);
			}

			if (forNode.test && forNode.test.type === 'BinaryExpression') {
				if (forNode.test.right.type === 'Identifier' && forNode.test.operator === '<' && this.isIdentifierConstant(forNode.test.right.name) === false) {

					if (!this.loopMaxIterations) {
						console.warn('Warning: loopMaxIterations is not set! Using default of 1000 which may result in unintended behavior.');
						console.warn('Set loopMaxIterations or use a for loop of fixed length to silence this message.');
					}

					retArr.push('for (');
					this.astGeneric(forNode.init, retArr);
					this.astGeneric(forNode.test.left, retArr);
					retArr.push(forNode.test.operator);
					retArr.push('LOOP_MAX');
					retArr.push(';');
					this.astGeneric(forNode.update, retArr);
					retArr.push(')');

					retArr.push('{\n');
					retArr.push('if (');
					this.astGeneric(forNode.test.left, retArr);
					retArr.push(forNode.test.operator);
					this.astGeneric(forNode.test.right, retArr);
					retArr.push(') {\n');
					if (forNode.body.type === 'BlockStatement') {
						for (var i = 0; i < forNode.body.body.length; i++) {
							this.astGeneric(forNode.body.body[i], retArr);
						}
					} else {
						this.astGeneric(forNode.body, retArr);
					}
					retArr.push('} else {\n');
					retArr.push('break;\n');
					retArr.push('}\n');
					retArr.push('}\n');

					return retArr;
				} else {
					var declarations = JSON.parse(JSON.stringify(forNode.init.declarations));
					var updateArgument = forNode.update.argument;
					if (!Array.isArray(declarations) || declarations.length < 1) {
						debugLog(this.jsFunctionString);
						throw new Error('Error: Incompatible for loop declaration');
					}

					if (declarations.length > 1) {
						var initArgument = null;
						for (var _i2 = 0; _i2 < declarations.length; _i2++) {
							var declaration = declarations[_i2];
							if (declaration.id.name === updateArgument.name) {
								initArgument = declaration;
								declarations.splice(_i2, 1);
							} else {
								retArr.push('float ');
								this.astGeneric(declaration, retArr);
								retArr.push(';');
							}
						}

						retArr.push('for (float ');
						this.astGeneric(initArgument, retArr);
						retArr.push(';');
					} else {
						retArr.push('for (');
						this.astGeneric(forNode.init, retArr);
					}

					this.astGeneric(forNode.test, retArr);
					retArr.push(';');
					this.astGeneric(forNode.update, retArr);
					retArr.push(')');
					this.astGeneric(forNode.body, retArr);
					return retArr;
				}
			}

			throw this.astErrorOutput('Invalid for statement', forNode);
		}

		/**
   * @memberOf WebGLFunctionNode#
   * @function
   * @name astWhileStatement
   *
   * @desc Parses the abstract syntax tree for *while* loop
   *
   *
   * @param {Object} whileNode - An ast Node
   * @param {Array} retArr - return array string
   *
   * @returns {Array} the parsed webgl string
   */

	}, {
		key: 'astWhileStatement',
		value: function astWhileStatement(whileNode, retArr) {
			if (whileNode.type !== 'WhileStatement') {
				throw this.astErrorOutput('Invalid while statment', whileNode);
			}

			retArr.push('for (float i = 0.0; i < LOOP_MAX; i++) {');
			retArr.push('if (');
			this.astGeneric(whileNode.test, retArr);
			retArr.push(') {\n');
			this.astGeneric(whileNode.body, retArr);
			retArr.push('} else {\n');
			retArr.push('break;\n');
			retArr.push('}\n');
			retArr.push('}\n');

			return retArr;
		}

		/**
   * @memberOf WebGLFunctionNode#
   * @function
   * @name astWhileStatement
   *
   * @desc Parses the abstract syntax tree for *do while* loop
   *
   *
   * @param {Object} doWhileNode - An ast Node
   * @param {Array} retArr - return array string
   *
   * @returns {Array} the parsed webgl string
   */

	}, {
		key: 'astDoWhileStatement',
		value: function astDoWhileStatement(doWhileNode, retArr) {
			if (doWhileNode.type !== 'DoWhileStatement') {
				throw this.astErrorOutput('Invalid while statment', doWhileNode);
			}

			retArr.push('for (float i = 0.0; i < LOOP_MAX; i++) {');
			this.astGeneric(doWhileNode.body, retArr);
			retArr.push('if (!');
			this.astGeneric(doWhileNode.test, retArr);
			retArr.push(') {\n');
			retArr.push('break;\n');
			retArr.push('}\n');
			retArr.push('}\n');

			return retArr;
		}

		/**
   * @memberOf WebGLFunctionNode#
   * @function
   * @name astAssignmentExpression
   *
   * @desc Parses the abstract syntax tree for *Assignment* Expression
   *
   * @param {Object} assNode - An ast Node
   * @param {Array} retArr - return array string
   *
   * @returns {Array} the append retArr
   */

	}, {
		key: 'astAssignmentExpression',
		value: function astAssignmentExpression(assNode, retArr) {
			if (assNode.operator === '%=') {
				this.astGeneric(assNode.left, retArr);
				retArr.push('=');
				retArr.push('mod(');
				this.astGeneric(assNode.left, retArr);
				retArr.push(',');
				this.astGeneric(assNode.right, retArr);
				retArr.push(')');
			} else {
				this.astGeneric(assNode.left, retArr);
				retArr.push(assNode.operator);
				this.astGeneric(assNode.right, retArr);
				return retArr;
			}
		}

		/**
   * @memberOf WebGLFunctionNode#
   * @function
   * @name astEmptyStatement
   *
   * @desc Parses the abstract syntax tree for an *Empty* Statement
   *
   * @param {Object} eNode - An ast Node
   * @param {Array} retArr - return array string
   *
   * @returns {Array} the append retArr
   */

	}, {
		key: 'astEmptyStatement',
		value: function astEmptyStatement(eNode, retArr) {
			//retArr.push(';\n');
			return retArr;
		}

		/**
   * @memberOf WebGLFunctionNode#
   * @function
   * @name astBlockStatement
   *
   * @desc Parses the abstract syntax tree for *Block* statement
   *
   * @param {Object} bNode - the AST object to parse
   * @param {Array} retArr - return array string
   *
   * @returns {Array} the append retArr
   */

	}, {
		key: 'astBlockStatement',
		value: function astBlockStatement(bNode, retArr) {
			retArr.push('{\n');
			for (var i = 0; i < bNode.body.length; i++) {
				this.astGeneric(bNode.body[i], retArr);
			}
			retArr.push('}\n');
			return retArr;
		}

		/**
   * @memberOf WebGLFunctionNode#
   * @function
   * @name astExpressionStatement
   *
   * @desc Parses the abstract syntax tree for *generic expression* statement
   *
   * @param {Object} esNode - An ast Node
   * @param {Array} retArr - return array string
   *
   * @returns {Array} the append retArr
   */

	}, {
		key: 'astExpressionStatement',
		value: function astExpressionStatement(esNode, retArr) {
			this.astGeneric(esNode.expression, retArr);
			retArr.push(';\n');
			return retArr;
		}

		/**
   * @memberOf WebGLFunctionNode#
   * @function
   * @name astVariableDeclaration
   *
   * @desc Parses the abstract syntax tree for *Variable Declaration*
   *
   * @param {Object} vardecNode - An ast Node
   * @param {Array} retArr - return array string
   *
   * @returns {Array} the append retArr
   */

	}, {
		key: 'astVariableDeclaration',
		value: function astVariableDeclaration(vardecNode, retArr) {
			for (var i = 0; i < vardecNode.declarations.length; i++) {
				var declaration = vardecNode.declarations[i];
				if (i > 0) {
					retArr.push(',');
				}
				var retDeclaration = [];
				this.astGeneric(declaration, retDeclaration);
				if (retDeclaration[2] === 'getImage2D(' || retDeclaration[2] === 'getImage3D(') {
					if (i === 0) {
						retArr.push('vec4 ');
					}
					this.declarations[declaration.id.name] = 'vec4';
				} else {
					if (i === 0) {
						retArr.push('float ');
					}
					this.declarations[declaration.id.name] = 'float';
				}
				retArr.push.apply(retArr, retDeclaration);
			}
			retArr.push(';');
			return retArr;
		}

		/**
   * @memberOf WebGLFunctionNode#
   * @function
   * @name astVariableDeclarator
   *
   * @desc Parses the abstract syntax tree for *Variable Declarator*
   *
   * @param {Object} ivardecNode - An ast Node
   * @param {Array} retArr - return array string
   *
   * @returns {Array} the append retArr
   */

	}, {
		key: 'astVariableDeclarator',
		value: function astVariableDeclarator(ivardecNode, retArr) {
			this.astGeneric(ivardecNode.id, retArr);
			if (ivardecNode.init !== null) {
				retArr.push('=');
				this.astGeneric(ivardecNode.init, retArr);
			}
			return retArr;
		}

		/**
   * @memberOf WebGLFunctionNode#
   * @function
   * @name astIfStatement
   *
   * @desc Parses the abstract syntax tree for *If* Statement
   *
   * @param {Object} ifNode - An ast Node
   * @param {Array} retArr - return array string
   *
   * @returns {Array} the append retArr
   */

	}, {
		key: 'astIfStatement',
		value: function astIfStatement(ifNode, retArr) {
			retArr.push('if (');
			this.astGeneric(ifNode.test, retArr);
			retArr.push(')');
			if (ifNode.consequent.type === 'BlockStatement') {
				this.astGeneric(ifNode.consequent, retArr);
			} else {
				retArr.push(' {\n');
				this.astGeneric(ifNode.consequent, retArr);
				retArr.push('\n}\n');
			}

			if (ifNode.alternate) {
				retArr.push('else ');
				if (ifNode.alternate.type === 'BlockStatement') {
					this.astGeneric(ifNode.alternate, retArr);
				} else {
					retArr.push(' {\n');
					this.astGeneric(ifNode.alternate, retArr);
					retArr.push('\n}\n');
				}
			}
			return retArr;
		}

		/**
   * @memberOf WebGLFunctionNode#
   * @function
   * @name astBreakStatement
   *
   * @desc Parses the abstract syntax tree for *Break* Statement
   *
   * @param {Object} brNode - An ast Node
   * @param {Array} retArr - return array string
   *
   * @returns {Array} the append retArr
   */

	}, {
		key: 'astBreakStatement',
		value: function astBreakStatement(brNode, retArr) {
			retArr.push('break;\n');
			return retArr;
		}

		/**
   * @memberOf WebGLFunctionNode#
   * @function
   * @name astContinueStatement
   *
   * @desc Parses the abstract syntax tree for *Continue* Statement
   *
   * @param {Object} crNode - An ast Node
   * @param {Array} retArr - return array string
   *
   * @returns {Array} the append retArr
   */

	}, {
		key: 'astContinueStatement',
		value: function astContinueStatement(crNode, retArr) {
			retArr.push('continue;\n');
			return retArr;
		}

		/**
   * @memberOf WebGLFunctionNode#
   * @function
   * @name astLogicalExpression
   *
   * @desc Parses the abstract syntax tree for *Logical* Expression
   *
   * @param {Object} logNode - An ast Node
   * @param {Array} retArr - return array string
   *
   * @returns {Array} the append retArr
   */

	}, {
		key: 'astLogicalExpression',
		value: function astLogicalExpression(logNode, retArr) {
			retArr.push('(');
			this.astGeneric(logNode.left, retArr);
			retArr.push(logNode.operator);
			this.astGeneric(logNode.right, retArr);
			retArr.push(')');
			return retArr;
		}

		/**
   * @memberOf WebGLFunctionNode#
   * @function
   * @name astUpdateExpression
   *
   * @desc Parses the abstract syntax tree for *Update* Expression
   *
   * @param {Object} uNode - An ast Node
   * @param {Array} retArr - return array string
   *
   * @returns {Array} the append retArr
   */

	}, {
		key: 'astUpdateExpression',
		value: function astUpdateExpression(uNode, retArr) {
			if (uNode.prefix) {
				retArr.push(uNode.operator);
				this.astGeneric(uNode.argument, retArr);
			} else {
				this.astGeneric(uNode.argument, retArr);
				retArr.push(uNode.operator);
			}

			return retArr;
		}

		/**
   * @memberOf WebGLFunctionNode#
   * @function
   * @name astUnaryExpression
   *
   * @desc Parses the abstract syntax tree for *Unary* Expression
   *
   * @param {Object} uNode - An ast Node
   * @param {Array} retArr - return array string
   *
   * @returns {Array} the append retArr
   */

	}, {
		key: 'astUnaryExpression',
		value: function astUnaryExpression(uNode, retArr) {
			if (uNode.prefix) {
				retArr.push(uNode.operator);
				this.astGeneric(uNode.argument, retArr);
			} else {
				this.astGeneric(uNode.argument, retArr);
				retArr.push(uNode.operator);
			}

			return retArr;
		}

		/**
   * @memberOf WebGLFunctionNode#
   * @function
   * @name astThisExpression
   *
   * @desc Parses the abstract syntax tree for *This* expression
   *
   * @param {Object} tNode - An ast Node
   * @param {Array} retArr - return array string
   *
   * @returns {Array} the append retArr
   */

	}, {
		key: 'astThisExpression',
		value: function astThisExpression(tNode, retArr) {
			retArr.push('this');
			return retArr;
		}

		/**
   * @memberOf WebGLFunctionNode#
   * @function
   * @name astMemberExpression
   *
   * @desc Parses the abstract syntax tree for *Member* Expression
   *
   * @param {Object} mNode - An ast Node
   * @param {Array} retArr - return array string
   *
   * @returns {Array} the append retArr
   */

	}, {
		key: 'astMemberExpression',
		value: function astMemberExpression(mNode, retArr) {
			debugLog("[in] astMemberExpression " + mNode.object.type);
			if (mNode.computed) {
				if (mNode.object.type === 'Identifier' || mNode.object.type === 'MemberExpression' && mNode.object.object.object && mNode.object.object.object.type === 'ThisExpression' && mNode.object.object.property.name === 'constants') {
					// Working logger
					var reqName = mNode.object.name;
					var funcName = this.functionName || 'kernel';
					var assumeNotTexture = false;

					// Possibly an array request - handle it as such
					if (this.paramNames) {
						var idx = this.paramNames.indexOf(reqName);
						if (idx >= 0 && this.paramTypes[idx] === 'float') {
							assumeNotTexture = true;
						}
					}
					debugLog("- astMemberExpression " + reqName + " " + funcName);
					if (assumeNotTexture) {
						// Get from array
						this.astGeneric(mNode.object, retArr);
						retArr.push('[int(');
						this.astGeneric(mNode.property, retArr);
						retArr.push(')]');
					} else {
						var isInGetParams = this.isState('in-get-call-parameters');
						var multiMemberExpression = this.isState('multi-member-expression');
						if (multiMemberExpression) {
							this.popState('multi-member-expression');
						}
						this.pushState('not-in-get-call-parameters');

						// This normally refers to the global read only input vars
						var variableType = null;
						if (mNode.object.name) {
							variableType = this.getParamType(mNode.object.name);
						} else if (mNode.object && mNode.object.object && mNode.object.object.object && mNode.object.object.object.type === 'ThisExpression') {
							variableType = this.getConstantType(mNode.object.property.name);
						}
						switch (variableType) {
							case 'vec4':
								// Get from local vec4
								this.astGeneric(mNode.object, retArr);
								retArr.push('[');
								retArr.push(mNode.property.raw);
								retArr.push(']');
								if (multiMemberExpression) {
									this.popState('not-in-get-call-parameters');
								}
								break;
							case 'HTMLImageArray':
								// Get from image
								retArr.push('getImage3D(');
								this.astGeneric(mNode.object, retArr);
								retArr.push(', ivec2(');
								this.astGeneric(mNode.object, retArr);
								retArr.push('Size[0],');
								this.astGeneric(mNode.object, retArr);
								retArr.push('Size[1]), ivec3(');
								this.astGeneric(mNode.object, retArr);
								retArr.push('Dim[0],');
								this.astGeneric(mNode.object, retArr);
								retArr.push('Dim[1],');
								this.astGeneric(mNode.object, retArr);
								retArr.push('Dim[2]');
								retArr.push('), ');
								this.popState('not-in-get-call-parameters');
								this.pushState('in-get-call-parameters');
								this.astGeneric(mNode.property, retArr);
								if (!multiMemberExpression) {
									this.popState('in-get-call-parameters');
								}
								retArr.push(')');
								break;
							case 'HTMLImage':
								// Get from image
								retArr.push('getImage2D(');
								this.astGeneric(mNode.object, retArr);
								retArr.push(', ivec2(');
								this.astGeneric(mNode.object, retArr);
								retArr.push('Size[0],');
								this.astGeneric(mNode.object, retArr);
								retArr.push('Size[1]), ivec3(');
								this.astGeneric(mNode.object, retArr);
								retArr.push('Dim[0],');
								this.astGeneric(mNode.object, retArr);
								retArr.push('Dim[1],');
								this.astGeneric(mNode.object, retArr);
								retArr.push('Dim[2]');
								retArr.push('), ');
								this.popState('not-in-get-call-parameters');
								this.pushState('in-get-call-parameters');
								this.astGeneric(mNode.property, retArr);
								if (!multiMemberExpression) {
									this.popState('in-get-call-parameters');
								}
								retArr.push(')');
								break;
							default:
								// Get from texture
								if (isInGetParams) {
									retArr.push('int(');
								}
								retArr.push('get(');
								this.astGeneric(mNode.object, retArr);
								retArr.push(', ivec2(');
								this.astGeneric(mNode.object, retArr);
								retArr.push('Size[0],');
								this.astGeneric(mNode.object, retArr);
								retArr.push('Size[1]), ivec3(');
								this.astGeneric(mNode.object, retArr);
								retArr.push('Dim[0],');
								this.astGeneric(mNode.object, retArr);
								retArr.push('Dim[1],');
								this.astGeneric(mNode.object, retArr);
								retArr.push('Dim[2]');
								retArr.push('), ');
								this.astGeneric(mNode.object, retArr);
								retArr.push('BitRatio');
								retArr.push(', ');
								this.popState('not-in-get-call-parameters');
								this.pushState('in-get-call-parameters');
								this.astGeneric(mNode.property, retArr);
								if (!multiMemberExpression) {
									this.popState('in-get-call-parameters');
								}
								retArr.push(')');
								if (isInGetParams) {
									retArr.push(')');
								}
								break;
						}
					}
				} else {

					debugLog("- astMemberExpression obj:", mNode.object);
					var stateStackDepth = this.states.length;
					var startedInGetParamsState = this.isState('in-get-call-parameters');
					if (!startedInGetParamsState) {
						this.pushState('multi-member-expression');
					}
					this.astGeneric(mNode.object, retArr);
					if (this.isState('multi-member-expression')) {
						this.popState('multi-member-expression');
					}
					var changedGetParamsState = !startedInGetParamsState && this.isState('in-get-call-parameters');
					var last = retArr.pop();
					retArr.push(',');
					debugLog("- astMemberExpression prop:", mNode.property);
					var shouldPopParamState = this.isState('should-pop-in-get-call-parameters');
					if (shouldPopParamState) {
						// go back to in-get-call-parameters state
						this.popState('should-pop-in-get-call-parameters');
					}
					this.astGeneric(mNode.property, retArr);
					retArr.push(last);

					if (changedGetParamsState) {
						// calling memberExpression should pop...
						this.pushState('should-pop-in-get-call-parameters');
					} else if (shouldPopParamState) {
						// do the popping!
						this.popState('in-get-call-parameters');
					}
				}
			} else {

				// Unroll the member expression
				var unrolled = this.astMemberExpressionUnroll(mNode);
				var unrolled_lc = unrolled.toLowerCase();
				debugLog("- astMemberExpression unrolled:", unrolled);
				// Its a constant, remove this.constants.
				if (unrolled.indexOf(constantsPrefix) === 0) {
					unrolled = 'constants_' + unrolled.slice(constantsPrefix.length);
				}

				// do we need to cast addressing vales to float?
				var castFloat = !this.isState('in-get-call-parameters');

				switch (unrolled_lc) {
					case 'this.thread.x':
						castFloat && retArr.push('float(');
						retArr.push('threadId.x');
						castFloat && retArr.push(')');
						break;
					case 'this.thread.y':
						castFloat && retArr.push('float(');
						retArr.push('threadId.y');
						castFloat && retArr.push(')');
						break;
					case 'this.thread.z':
						castFloat && retArr.push('float(');
						retArr.push('threadId.z');
						castFloat && retArr.push(')');
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
						if (mNode.object && mNode.object.name && this.declarations[mNode.object.name]) {
							retArr.push('user_');
						}
						retArr.push(unrolled);
				}
			}
			debugLog("[out] astMemberExpression " + mNode.object.type);
			return retArr;
		}
	}, {
		key: 'astSequenceExpression',
		value: function astSequenceExpression(sNode, retArr) {
			for (var i = 0; i < sNode.expressions.length; i++) {
				if (i > 0) {
					retArr.push(',');
				}
				this.astGeneric(sNode.expressions, retArr);
			}
			return retArr;
		}

		/**
   * @memberOf WebGLFunctionNode#
   * @function
   * @name astCallExpression
   *
   * @desc Parses the abstract syntax tree for *call* expression
   *
   * @param {Object} ast - the AST object to parse
   * @param {Array} retArr - return array string
   *
   * @returns  {Array} the append retArr
   */

	}, {
		key: 'astCallExpression',
		value: function astCallExpression(ast, retArr) {
			if (ast.callee) {
				// Get the full function call, unrolled
				var funcName = this.astMemberExpressionUnroll(ast.callee);

				// Its a math operator, remove the prefix
				if (funcName.indexOf(jsMathPrefix) === 0) {
					funcName = funcName.slice(jsMathPrefix.length);
				}

				// Its a local function, remove this
				if (funcName.indexOf(localPrefix) === 0) {
					funcName = funcName.slice(localPrefix.length);
				}

				// if this if grows to more than one, lets use a switch
				if (funcName === 'atan2') {
					funcName = 'atan';
				}

				// Register the function into the called registry
				if (this.calledFunctions.indexOf(funcName) < 0) {
					this.calledFunctions.push(funcName);
				}
				if (!this.hasOwnProperty('funcName')) {
					this.calledFunctionsArguments[funcName] = [];
				}

				var functionArguments = [];
				this.calledFunctionsArguments[funcName].push(functionArguments);

				// Call the function
				retArr.push(funcName);

				// Open arguments space
				retArr.push('(');

				// Add the vars
				for (var i = 0; i < ast.arguments.length; ++i) {
					var argument = ast.arguments[i];
					if (i > 0) {
						retArr.push(', ');
					}
					this.astGeneric(argument, retArr);
					if (argument.type === 'Identifier') {
						var paramIndex = this.paramNames.indexOf(argument.name);
						if (paramIndex === -1) {
							functionArguments.push(null);
						} else {
							functionArguments.push({
								name: argument.name,
								type: this.paramTypes[paramIndex]
							});
						}
					} else {
						functionArguments.push(null);
					}
				}

				// Close arguments space
				retArr.push(')');

				return retArr;
			}

			// Failure, unknown expression
			throw this.astErrorOutput('Unknown CallExpression', ast);

			return retArr;
		}

		/**
   * @memberOf WebGLFunctionNode#
   * @function
   * @name astArrayExpression
   *
   * @desc Parses the abstract syntax tree for *Array* Expression
   *
   * @param {Object} ast - the AST object to parse
   * @param {Array} retArr - return array string
   *
   * @returns {Array} the append retArr
   */

	}, {
		key: 'astArrayExpression',
		value: function astArrayExpression(arrNode, retArr) {
			var arrLen = arrNode.elements.length;

			retArr.push('float[' + arrLen + '](');
			for (var i = 0; i < arrLen; ++i) {
				if (i > 0) {
					retArr.push(', ');
				}
				var subNode = arrNode.elements[i];
				this.astGeneric(subNode, retArr);
			}
			retArr.push(')');

			return retArr;

			// // Failure, unknown expression
			// throw this.astErrorOutput(
			// 	'Unknown  ArrayExpression',
			// 	arrNode
			//);
		}

		/**
   * @memberOf WebGLFunctionNode#
   * @function
   * @name getFunctionPrototypeString
   *
   * @desc Returns the converted webgl shader function equivalent of the JS function
   *
   * @returns {String} webgl function string, result is cached under this.getFunctionPrototypeString
   *
   */

	}, {
		key: 'getFunctionPrototypeString',
		value: function getFunctionPrototypeString() {
			if (this.webGlFunctionPrototypeString) {
				return this.webGlFunctionPrototypeString;
			}
			return this.webGlFunctionPrototypeString = this.generate();
		}
	}, {
		key: 'build',
		value: function build() {
			return this.getFunctionPrototypeString().length > 0;
		}
	}], [{
		key: 'astFunctionPrototype',
		value: function astFunctionPrototype(ast, retArr) {
			// Setup function return type and name
			if (this.isRootKernel || this.isSubKernel) {
				return retArr;
			}

			retArr.push(this.returnType);
			retArr.push(' ');
			retArr.push(this.functionName);
			retArr.push('(');

			// Arguments handling
			for (var i = 0; i < this.paramNames.length; ++i) {
				if (i > 0) {
					retArr.push(', ');
				}

				retArr.push(this.paramTypes[i]);
				retArr.push(' ');
				retArr.push('user_');
				retArr.push(this.paramNames[i]);
			}

			retArr.push(');\n');

			return retArr;
		}
	}]);

	return WebGLFunctionNode;
}(FunctionNodeBase);

function isIdentifierKernelParam(paramName, ast, funcParam) {
	return funcParam.paramNames.indexOf(paramName) !== -1;
}

function ensureIndentifierType(paramName, expectedType, ast, funcParam) {
	var start = ast.loc.start;

	if (!isIdentifierKernelParam(paramName) && expectedType !== 'float') {
		throw new Error('Error unexpected identifier ' + paramName + ' on line ' + start.line);
	} else {
		var actualType = funcParam.paramTypes[funcParam.paramNames.indexOf(paramName)];
		if (actualType !== expectedType) {
			throw new Error('Error unexpected identifier ' + paramName + ' on line ' + start.line);
		}
	}
}

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