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
				console.log(this);
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
   * @name astGeneric
   *
   * @desc Parses the abstract syntax tree for generically to its respective function
   *
   * @param {Object} ast - the AST object to parse
   * @param {Array} retArr - return array string
   * @param {Function} funcParam - FunctionNode, that tracks compilation state
   *
   * @returns {Array} the parsed webgl string array
   */

	}, {
		key: 'astGeneric',
		value: function astGeneric(ast, retArr, funcParam) {
			if (ast === null) {
				throw this.astErrorOutput('NULL ast', ast, funcParam);
			} else {
				if (Array.isArray(ast)) {
					for (var i = 0; i < ast.length; i++) {
						this.astGeneric(ast[i], retArr, funcParam);
					}
					return retArr;
				}

				switch (ast.type) {
					case 'FunctionDeclaration':
						return this.astFunctionDeclaration(ast, retArr, funcParam);
					case 'FunctionExpression':
						return this.astFunctionExpression(ast, retArr, funcParam);
					case 'ReturnStatement':
						return this.astReturnStatement(ast, retArr, funcParam);
					case 'Literal':
						return this.astLiteral(ast, retArr, funcParam);
					case 'BinaryExpression':
						return this.astBinaryExpression(ast, retArr, funcParam);
					case 'Identifier':
						return this.astIdentifierExpression(ast, retArr, funcParam);
					case 'AssignmentExpression':
						return this.astAssignmentExpression(ast, retArr, funcParam);
					case 'ExpressionStatement':
						return this.astExpressionStatement(ast, retArr, funcParam);
					case 'EmptyStatement':
						return this.astEmptyStatement(ast, retArr, funcParam);
					case 'BlockStatement':
						return this.astBlockStatement(ast, retArr, funcParam);
					case 'IfStatement':
						return this.astIfStatement(ast, retArr, funcParam);
					case 'BreakStatement':
						return this.astBreakStatement(ast, retArr, funcParam);
					case 'ContinueStatement':
						return this.astContinueStatement(ast, retArr, funcParam);
					case 'ForStatement':
						return this.astForStatement(ast, retArr, funcParam);
					case 'WhileStatement':
						return this.astWhileStatement(ast, retArr, funcParam);
					case 'VariableDeclaration':
						return this.astVariableDeclaration(ast, retArr, funcParam);
					case 'VariableDeclarator':
						return this.astVariableDeclarator(ast, retArr, funcParam);
					case 'ThisExpression':
						return this.astThisExpression(ast, retArr, funcParam);
					case 'SequenceExpression':
						return this.astSequenceExpression(ast, retArr, funcParam);
					case 'UnaryExpression':
						return this.astUnaryExpression(ast, retArr, funcParam);
					case 'UpdateExpression':
						return this.astUpdateExpression(ast, retArr, funcParam);
					case 'LogicalExpression':
						return this.astLogicalExpression(ast, retArr, funcParam);
					case 'MemberExpression':
						return this.astMemberExpression(ast, retArr, funcParam);
					case 'CallExpression':
						return this.astCallExpression(ast, retArr, funcParam);
					case 'ArrayExpression':
						return this.astArrayExpression(ast, retArr, funcParam);
					case 'DebuggerStatement':
						return this.astDebuggerStatement(ast, retArr, funcParam);
				}

				throw this.astErrorOutput('Unknown ast type : ' + ast.type, ast, funcParam);
			}
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
   * @param {Function} funcParam - FunctionNode, that tracks compilation state
   *
   * @returns {Array} the append retArr
   */

	}, {
		key: 'astFunctionDeclaration',
		value: function astFunctionDeclaration(ast, retArr, funcParam) {
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
   * @param {Function} funcParam - FunctionNode, that tracks compilation state
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
   * @param {Function} funcParam - FunctionNode, that tracks compilation state
   *
   * @returns {Array} the append retArr
   */
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
   * @memberOf WebGLFunctionNode#
   * @function
   * @name astReturnStatement
   *
   * @desc Parses the abstract syntax tree for to *return* statement
   *
   * @param {Object} ast - the AST object to parse
   * @param {Array} retArr - return array string
   * @param {Object} funcParam - FunctionNode, that tracks compilation state
   *
   * @returns {Array} the append retArr
   */

	}, {
		key: 'astReturnStatement',
		value: function astReturnStatement(ast, retArr, funcParam) {
			if (funcParam.isRootKernel) {
				retArr.push('kernelResult = ');
				this.astGeneric(ast.argument, retArr, funcParam);
				retArr.push(';');
				retArr.push('return;');
			} else if (funcParam.isSubKernel) {
				retArr.push(funcParam.functionName + 'Result = ');
				this.astGeneric(ast.argument, retArr, funcParam);
				retArr.push(';');
				retArr.push('return ' + funcParam.functionName + 'Result;');
			} else {
				retArr.push('return ');
				this.astGeneric(ast.argument, retArr, funcParam);
				retArr.push(';');
			}

			//throw this.astErrorOutput(
			//	'Non main function return, is not supported : '+funcParam.currentFunctionNamespace,
			//	ast, funcParam
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
   * @param {Function} funcParam - FunctionNode, that tracks compilation state
   *
   * @returns {Array} the append retArr
   */

	}, {
		key: 'astLiteral',
		value: function astLiteral(ast, retArr, funcParam) {

			// Reject non numeric literals
			if (isNaN(ast.value)) {
				throw this.astErrorOutput('Non-numeric literal not supported : ' + ast.value, ast, funcParam);
			}

			// Push the literal value as a float/int
			retArr.push(ast.value);

			// If it was an int, node made a float
			if (Number.isInteger(ast.value)) {
				retArr.push('.0');
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
   * @param {Function} funcParam - FunctionNode, that tracks compilation state
   *
   * @returns {Array} the append retArr
   */

	}, {
		key: 'astBinaryExpression',
		value: function astBinaryExpression(ast, retArr, funcParam) {
			retArr.push('(');

			if (ast.operator === '%') {
				retArr.push('mod(');
				this.astGeneric(ast.left, retArr, funcParam);
				retArr.push(',');
				this.astGeneric(ast.right, retArr, funcParam);
				retArr.push(')');
			} else if (ast.operator === '===') {
				this.astGeneric(ast.left, retArr, funcParam);
				retArr.push('==');
				this.astGeneric(ast.right, retArr, funcParam);
			} else if (ast.operator === '!==') {
				this.astGeneric(ast.left, retArr, funcParam);
				retArr.push('!=');
				this.astGeneric(ast.right, retArr, funcParam);
			} else {
				this.astGeneric(ast.left, retArr, funcParam);
				retArr.push(ast.operator);
				this.astGeneric(ast.right, retArr, funcParam);
			}

			retArr.push(')');

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
   * @param {Function} funcParam - FunctionNode, that tracks compilation state
   *
   * @returns {Array} the append retArr
   */

	}, {
		key: 'astIdentifierExpression',
		value: function astIdentifierExpression(idtNode, retArr, funcParam) {
			if (idtNode.type !== 'Identifier') {
				throw this.astErrorOutput('IdentifierExpression - not an Identifier', idtNode, funcParam);
			}

			switch (idtNode.name) {
				case 'gpu_threadX':
					retArr.push('threadId.x');
					break;
				case 'gpu_threadY':
					retArr.push('threadId.y');
					break;
				case 'gpu_threadZ':
					retArr.push('threadId.z');
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
				default:
					if (this.constants && this.constants.hasOwnProperty(idtNode.name)) {
						retArr.push('constants_' + idtNode.name);
					} else {
						var userParamName = funcParam.getUserParamName(idtNode.name);
						if (userParamName !== null) {
							retArr.push('user_' + userParamName);
						} else {
							retArr.push('user_' + idtNode.name);
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
   * @param {Function} funcParam - FunctionNode, that tracks compilation state
   *
   * @returns {Array} the parsed webgl string
   */

	}, {
		key: 'astForStatement',
		value: function astForStatement(forNode, retArr, funcParam) {
			if (forNode.type !== 'ForStatement') {
				throw this.astErrorOutput('Invalid for statment', forNode, funcParam);
			}

			if (forNode.test && forNode.test.type === 'BinaryExpression') {
				if (forNode.test.right.type === 'Identifier' && forNode.test.operator === '<' && this.isIdentifierConstant(forNode.test.right.name) === false) {

					if (!this.loopMaxIterations) {
						console.warn('Warning: loopMaxIterations is not set! Using default of 1000 which may result in unintended behavior.');
						console.warn('Set loopMaxIterations or use a for loop of fixed length to silence this message.');
					}

					retArr.push('for (');
					this.astGeneric(forNode.init, retArr, funcParam);
					this.astGeneric(forNode.test.left, retArr, funcParam);
					retArr.push(forNode.test.operator);
					retArr.push('LOOP_MAX');
					retArr.push(';');
					this.astGeneric(forNode.update, retArr, funcParam);
					retArr.push(')');

					retArr.push('{\n');
					retArr.push('if (');
					this.astGeneric(forNode.test.left, retArr, funcParam);
					retArr.push(forNode.test.operator);
					this.astGeneric(forNode.test.right, retArr, funcParam);
					retArr.push(') {\n');
					if (forNode.body.type === 'BlockStatement') {
						for (var i = 0; i < forNode.body.body.length; i++) {
							this.astGeneric(forNode.body.body[i], retArr, funcParam);
						}
					} else {
						this.astGeneric(forNode.body, retArr, funcParam);
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
						console.log(this.jsFunctionString);
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
								this.astGeneric(declaration, retArr, funcParam);
								retArr.push(';');
							}
						}

						retArr.push('for (float ');
						this.astGeneric(initArgument, retArr, funcParam);
						retArr.push(';');
					} else {
						retArr.push('for (');
						this.astGeneric(forNode.init, retArr, funcParam);
					}

					this.astGeneric(forNode.test, retArr, funcParam);
					retArr.push(';');
					this.astGeneric(forNode.update, retArr, funcParam);
					retArr.push(')');
					this.astGeneric(forNode.body, retArr, funcParam);
					return retArr;
				}
			}

			throw this.astErrorOutput('Invalid for statement', forNode, funcParam);
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
   * @param {Function} funcParam - FunctionNode, that tracks compilation state
   *
   * @returns {Array} the parsed webgl string
   */

	}, {
		key: 'astWhileStatement',
		value: function astWhileStatement(whileNode, retArr, funcParam) {
			if (whileNode.type !== 'WhileStatement') {
				throw this.astErrorOutput('Invalid while statment', whileNode, funcParam);
			}

			retArr.push('for (float i = 0.0; i < LOOP_MAX; i++) {');
			retArr.push('if (');
			this.astGeneric(whileNode.test, retArr, funcParam);
			retArr.push(') {\n');
			this.astGeneric(whileNode.body, retArr, funcParam);
			retArr.push('} else {\n');
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
   * @param {Function} funcParam - FunctionNode, that tracks compilation state
   *
   * @returns {Array} the append retArr
   */

	}, {
		key: 'astAssignmentExpression',
		value: function astAssignmentExpression(assNode, retArr, funcParam) {
			if (assNode.operator === '%=') {
				this.astGeneric(assNode.left, retArr, funcParam);
				retArr.push('=');
				retArr.push('mod(');
				this.astGeneric(assNode.left, retArr, funcParam);
				retArr.push(',');
				this.astGeneric(assNode.right, retArr, funcParam);
				retArr.push(')');
			} else {
				this.astGeneric(assNode.left, retArr, funcParam);
				retArr.push(assNode.operator);
				this.astGeneric(assNode.right, retArr, funcParam);
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
   * @param {Function} funcParam - FunctionNode, that tracks compilation state
   *
   * @returns {Array} the append retArr
   */

	}, {
		key: 'astEmptyStatement',
		value: function astEmptyStatement(eNode, retArr, funcParam) {
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
   * @param {Object} bnode - the AST object to parse
   * @param {Array} retArr - return array string
   * @param {Function} funcParam - FunctionNode, that tracks compilation state
   *
   * @returns {Array} the append retArr
   */

	}, {
		key: 'astBlockStatement',
		value: function astBlockStatement(bNode, retArr, funcParam) {
			retArr.push('{\n');
			for (var i = 0; i < bNode.body.length; i++) {
				this.astGeneric(bNode.body[i], retArr, funcParam);
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
   * @param {Function} funcParam - FunctionNode, that tracks compilation state
   *
   * @returns {Array} the append retArr
   */

	}, {
		key: 'astExpressionStatement',
		value: function astExpressionStatement(esNode, retArr, funcParam) {
			this.astGeneric(esNode.expression, retArr, funcParam);
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
   * @param {Function} funcParam - FunctionNode, that tracks compilation state
   *
   * @returns {Array} the append retArr
   */

	}, {
		key: 'astVariableDeclaration',
		value: function astVariableDeclaration(vardecNode, retArr, funcParam) {
			retArr.push('float ');
			for (var i = 0; i < vardecNode.declarations.length; i++) {
				if (i > 0) {
					retArr.push(',');
				}
				this.astGeneric(vardecNode.declarations[i], retArr, funcParam);
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
   * @param {Function} funcParam - FunctionNode, that tracks compilation state
   *
   * @returns {Array} the append retArr
   */

	}, {
		key: 'astVariableDeclarator',
		value: function astVariableDeclarator(ivardecNode, retArr, funcParam) {
			this.astGeneric(ivardecNode.id, retArr, funcParam);
			if (ivardecNode.init !== null) {
				retArr.push('=');
				this.astGeneric(ivardecNode.init, retArr, funcParam);
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
   * @param {Function} funcParam - FunctionNode, that tracks compilation state
   *
   * @returns {Array} the append retArr
   */

	}, {
		key: 'astIfStatement',
		value: function astIfStatement(ifNode, retArr, funcParam) {
			retArr.push('if (');
			this.astGeneric(ifNode.test, retArr, funcParam);
			retArr.push(')');
			if (ifNode.consequent.type === 'BlockStatement') {
				this.astGeneric(ifNode.consequent, retArr, funcParam);
			} else {
				retArr.push(' {\n');
				this.astGeneric(ifNode.consequent, retArr, funcParam);
				retArr.push('\n}\n');
			}

			if (ifNode.alternate) {
				retArr.push('else ');
				if (ifNode.alternate.type === 'BlockStatement') {
					this.astGeneric(ifNode.alternate, retArr, funcParam);
				} else {
					retArr.push(' {\n');
					this.astGeneric(ifNode.alternate, retArr, funcParam);
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
   * @param {Function} funcParam - FunctionNode, that tracks compilation state
   *
   * @returns {Array} the append retArr
   */

	}, {
		key: 'astBreakStatement',
		value: function astBreakStatement(brNode, retArr, funcParam) {
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
   * @param {Function} funcParam - FunctionNode, that tracks compilation state
   *
   * @returns {Array} the append retArr
   */

	}, {
		key: 'astContinueStatement',
		value: function astContinueStatement(crNode, retArr, funcParam) {
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
   * @param {Function} funcParam - FunctionNode, that tracks compilation state
   *
   * @returns {Array} the append retArr
   */

	}, {
		key: 'astLogicalExpression',
		value: function astLogicalExpression(logNode, retArr, funcParam) {
			retArr.push('(');
			this.astGeneric(logNode.left, retArr, funcParam);
			retArr.push(logNode.operator);
			this.astGeneric(logNode.right, retArr, funcParam);
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
   * @param {Function} funcParam - FunctionNode, that tracks compilation state
   *
   * @returns {Array} the append retArr
   */

	}, {
		key: 'astUpdateExpression',
		value: function astUpdateExpression(uNode, retArr, funcParam) {
			if (uNode.prefix) {
				retArr.push(uNode.operator);
				this.astGeneric(uNode.argument, retArr, funcParam);
			} else {
				this.astGeneric(uNode.argument, retArr, funcParam);
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
   * @param {Function} funcParam - FunctionNode, that tracks compilation state
   *
   * @returns {Array} the append retArr
   */

	}, {
		key: 'astUnaryExpression',
		value: function astUnaryExpression(uNode, retArr, funcParam) {
			if (uNode.prefix) {
				retArr.push(uNode.operator);
				this.astGeneric(uNode.argument, retArr, funcParam);
			} else {
				this.astGeneric(uNode.argument, retArr, funcParam);
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
   * @param {Function} funcParam - FunctionNode, that tracks compilation state
   *
   * @returns {Array} the append retArr
   */

	}, {
		key: 'astThisExpression',
		value: function astThisExpression(tNode, retArr, funcParam) {
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
	}, {
		key: 'astSequenceExpression',
		value: function astSequenceExpression(sNode, retArr, funcParam) {
			for (var i = 0; i < sNode.expressions.length; i++) {
				if (i > 0) {
					retArr.push(',');
				}
				this.astGeneric(sNode.expressions, retArr, funcParam);
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
   * @param {Function} funcParam - FunctionNode, that tracks compilation state
   *
   * @returns  {Array} the append retArr
   */

	}, {
		key: 'astCallExpression',
		value: function astCallExpression(ast, retArr, funcParam) {
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
				if (funcParam.calledFunctions.indexOf(funcName) < 0) {
					funcParam.calledFunctions.push(funcName);
				}
				if (!funcParam.hasOwnProperty('funcName')) {
					funcParam.calledFunctionsArguments[funcName] = [];
				}

				var functionArguments = [];
				funcParam.calledFunctionsArguments[funcName].push(functionArguments);

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
					this.astGeneric(argument, retArr, funcParam);
					if (argument.type === 'Identifier') {
						var paramIndex = funcParam.paramNames.indexOf(argument.name);
						if (paramIndex === -1) {
							functionArguments.push(null);
						} else {
							functionArguments.push({
								name: argument.name,
								type: funcParam.paramTypes[paramIndex]
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
			throw this.astErrorOutput('Unknown CallExpression', ast, funcParam);

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
   * @param {Function} funcParam - FunctionNode, that tracks compilation state
   *
   * @returns {Array} the append retArr
   */

	}, {
		key: 'astArrayExpression',
		value: function astArrayExpression(arrNode, retArr, funcParam) {
			var arrLen = arrNode.elements.length;

			retArr.push('float[' + arrLen + '](');
			for (var i = 0; i < arrLen; ++i) {
				if (i > 0) {
					retArr.push(', ');
				}
				var subNode = arrNode.elements[i];
				this.astGeneric(subNode, retArr, funcParam);
			}
			retArr.push(')');

			return retArr;

			// // Failure, unknown expression
			// throw this.astErrorOutput(
			// 	'Unknown  ArrayExpression',
			// 	arrNode, funcParam
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
		value: function astFunctionPrototype(ast, retArr, funcParam) {
			// Setup function return type and name
			if (funcParam.isRootKernel || funcParam.isSubKernel) {
				return retArr;
			}

			retArr.push(funcParam.returnType);
			retArr.push(' ');
			retArr.push(funcParam.functionName);
			retArr.push('(');

			// Arguments handling
			for (var i = 0; i < funcParam.paramNames.length; ++i) {
				if (i > 0) {
					retArr.push(', ');
				}

				retArr.push(funcParam.paramTypes[i]);
				retArr.push(' ');
				retArr.push('user_');
				retArr.push(funcParam.paramNames[i]);
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

	if (!isIdentifierKernelParam(paramName, funcParam) && expectedType !== 'float') {
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