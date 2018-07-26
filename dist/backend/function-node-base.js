'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var utils = require('../core/utils');
var acorn = require('acorn');

module.exports = function () {

	/**
  * @constructor FunctionNodeBase
  * 
  * @desc Represents a single function, inside JS, webGL, or openGL.
  * 
  * <p>This handles all the raw state, converted state, etc. Of a single function.</p>
  * 
  * @prop {String} functionName - Name of the function
  * @prop {Function} jsFunction - The JS Function the node represents
  * @prop {String} jsFunctionString - jsFunction.toString()
  * @prop {String[]} paramNames - Parameter names of the function
  * @prop {String[]} paramTypes - Shader land parameters type assumption
  * @prop {Boolean} isRootKernel - Special indicator, for kernel function
  * @prop {String} webglFunctionString - webgl converted function string
  * @prop {String} openglFunctionString - opengl converted function string
  * @prop {String[]} calledFunctions - List of all the functions called
  * @param {String} functionName - Function name to assume, if its null, it attempts to extract from the function
  * @param {Function|String} jsFunction - JS Function to do conversion
  * @param {Object} options
  *
  */
	function BaseFunctionNode(functionName, jsFunction, options) {
		_classCallCheck(this, BaseFunctionNode);

		this.calledFunctions = [];
		this.calledFunctionsArguments = {};
		this.addFunction = null;
		this.isRootKernel = false;
		this.isSubKernel = false;
		this.parent = null;
		this.debug = null;
		this.prototypeOnly = null;
		this.constants = null;
		this.output = null;
		this.declarations = {};
		this.states = [];
		this.fixIntegerDivisionAccuracy = null;

		var paramTypes = void 0;
		var returnType = void 0;
		if (options) {
			if (options.hasOwnProperty('debug')) {
				this.debug = options.debug;
			}
			if (options.hasOwnProperty('prototypeOnly')) {
				this.prototypeOnly = options.prototypeOnly;
			}
			if (options.hasOwnProperty('constants')) {
				this.constants = options.constants;
			}
			if (options.hasOwnProperty('output')) {
				this.output = options.output;
			}
			if (options.hasOwnProperty('loopMaxIterations')) {
				this.loopMaxIterations = options.loopMaxIterations;
			}
			if (options.hasOwnProperty('paramTypes')) {
				this.paramTypes = paramTypes = options.paramTypes;
			}
			if (options.hasOwnProperty('returnType')) {
				returnType = options.returnType;
			}
			if (options.hasOwnProperty('fixIntegerDivisionAccuracy')) {
				this.fixIntegerDivisionAccuracy = options.fixIntegerDivisionAccuracy;
			}
		}

		//
		// Missing jsFunction object exception
		//
		if (!jsFunction) {
			throw 'jsFunction, parameter is missing';
		}

		//
		// Setup jsFunction and its string property + validate them
		//
		this.jsFunctionString = jsFunction.toString();
		if (!utils.isFunctionString(this.jsFunctionString)) {
			console.error('jsFunction, to string conversion check failed: not a function?', this.jsFunctionString);
			throw 'jsFunction, to string conversion check failed: not a function?';
		}

		if (!utils.isFunction(jsFunction)) {
			//throw 'jsFunction, is not a valid JS Function';
			this.jsFunction = null;
		} else {
			this.jsFunction = jsFunction;
		}

		//
		// Setup the function name property
		//
		this.functionName = functionName || jsFunction && jsFunction.name || utils.getFunctionNameFromString(this.jsFunctionString);

		if (!this.functionName) {
			throw 'jsFunction, missing name argument or value';
		}

		//
		// Extract parameter name, and its argument types
		//
		this.paramNames = utils.getParamNamesFromString(this.jsFunctionString);
		if (paramTypes) {
			if (Array.isArray(paramTypes)) {
				if (paramTypes.length !== this.paramNames.length) {
					throw 'Invalid argument type array length, against function length -> (' + paramTypes.length + ',' + this.paramNames.length + ')';
				}
				this.paramTypes = paramTypes;
			} else if ((typeof paramTypes === 'undefined' ? 'undefined' : _typeof(paramTypes)) === 'object') {
				var paramVariableNames = Object.keys(paramTypes);
				if (paramTypes.hasOwnProperty('returns')) {
					this.returnType = paramTypes.returns;
					paramVariableNames.splice(paramVariableNames.indexOf('returns'), 1);
				}
				if (paramVariableNames.length > 0 && paramVariableNames.length !== this.paramNames.length) {
					throw 'Invalid argument type array length, against function length -> (' + paramVariableNames.length + ',' + this.paramNames.length + ')';
				} else {
					this.paramTypes = this.paramNames.map(function (key) {
						if (paramTypes.hasOwnProperty(key)) {
							return paramTypes[key];
						} else {
							return 'float';
						}
					});
				}
			}
		} else {
			this.paramTypes = [];
		}

		//
		// Return type handling
		//
		if (!this.returnType) {
			this.returnType = returnType || 'float';
		}
	}

	_createClass(BaseFunctionNode, [{
		key: 'isIdentifierConstant',
		value: function isIdentifierConstant(paramName) {
			if (!this.constants) return false;
			return this.constants.hasOwnProperty(paramName);
		}
	}, {
		key: 'isInput',
		value: function isInput(paramName) {
			return this.paramTypes[this.paramNames.indexOf(paramName)] === 'Input';
		}
	}, {
		key: 'setAddFunction',
		value: function setAddFunction(fn) {
			this.addFunction = fn;
			return this;
		}
	}, {
		key: 'pushState',
		value: function pushState(state) {
			this.states.push(state);
		}
	}, {
		key: 'popState',
		value: function popState(state) {
			if (this.state !== state) {
				throw new Error('Cannot popState ' + state + ' when in ' + this.state);
			}
			this.states.pop();
		}
	}, {
		key: 'isState',
		value: function isState(state) {
			return this.state === state;
		}
	}, {
		key: 'getJsFunction',

		/**
   * 
   * Core Functions
   * 
   */

		/**
   * @memberOf FunctionNodeBase#
   * @function
   * @name getJSFunction
   *
   * @desc Gets and return the stored JS Function.
   * Note: that this internally eval the function, if only the string was provided on construction
   *
   * @returns {Function} The function object
   *
   */
		value: function getJsFunction() {
			if (this.jsFunction) {
				return this.jsFunction;
			}

			if (this.jsFunctionString) {
				this.jsFunction = eval(this.jsFunctionString);
				return this.jsFunction;
			}

			throw 'Missing jsFunction, and jsFunctionString parameter';
		}

		/**
   * @memberOf FunctionNodeBase#
   * @function
   * @name astMemberExpressionUnroll
   * @desc Parses the abstract syntax tree for binary expression.
   *
   * <p>Utility function for astCallExpression.</p>
   *
   * @param {Object} ast - the AST object to parse
   *
   * @returns {String} the function namespace call, unrolled
   */

	}, {
		key: 'astMemberExpressionUnroll',
		value: function astMemberExpressionUnroll(ast) {
			if (ast.type === 'Identifier') {
				return ast.name;
			} else if (ast.type === 'ThisExpression') {
				return 'this';
			}

			if (ast.type === 'MemberExpression') {
				if (ast.object && ast.property) {
					//babel sniffing
					if (ast.object.hasOwnProperty('name') && ast.object.name[0] === '_') {
						return this.astMemberExpressionUnroll(ast.property);
					}

					return this.astMemberExpressionUnroll(ast.object) + '.' + this.astMemberExpressionUnroll(ast.property);
				}
			}

			//babel sniffing
			if (ast.hasOwnProperty('expressions')) {
				var firstExpression = ast.expressions[0];
				if (firstExpression.type === 'Literal' && firstExpression.value === 0 && ast.expressions.length === 2) {
					return this.astMemberExpressionUnroll(ast.expressions[1]);
				}
			}

			// Failure, unknown expression
			throw this.astErrorOutput('Unknown CallExpression_unroll', ast);
		}

		/**
   * @memberOf FunctionNodeBase#
   * @function
   * @name getJsAST
   *
   * @desc Parses the class function JS, and returns its Abstract Syntax Tree object.
   *
   * This is used internally to convert to shader code
   *
   * @param {Object} [inParser] - Parser to use, assumes in scope 'parser' if null or undefined
   *
   * @returns {Object} The function AST Object, note that result is cached under this.jsFunctionAST;
   *
   */

	}, {
		key: 'getJsAST',
		value: function getJsAST(inParser) {
			if (this.jsFunctionAST) {
				return this.jsFunctionAST;
			}

			inParser = inParser || acorn;
			if (inParser === null) {
				throw 'Missing JS to AST parser';
			}

			var ast = inParser.parse('var ' + this.functionName + ' = ' + this.jsFunctionString + ';', {
				locations: true
			});
			if (ast === null) {
				throw 'Failed to parse JS code';
			}

			// take out the function object, outside the var declarations
			var funcAST = ast.body[0].declarations[0].init;
			this.jsFunctionAST = funcAST;

			return funcAST;
		}

		/**
   * @memberOf FunctionNodeBase#
   * @function
   * @name getFunctionString
   *
   * @desc Returns the converted webgl shader function equivalent of the JS function
   *
   * @returns {String} webgl function string, result is cached under this.webGlFunctionString
   *
   */

	}, {
		key: 'getFunctionString',
		value: function getFunctionString() {
			this.generate();
			return this.functionString;
		}

		/**
   * @memberOf FunctionNodeBase#
   * @function
   * @name setFunctionString
   *
   * @desc Set the functionString value, overwriting it
   *
   * @param {String} functionString - Shader code string, representing the function
   *
   */

	}, {
		key: 'setFunctionString',
		value: function setFunctionString(functionString) {
			this.functionString = functionString;
		}

		/**
   * @memberOf FunctionNodeBase#
   * @function
   * @name getParamType
   *
   * @desc Return the type of parameter sent to subKernel/Kernel.
   *
   * @param {String} paramName - Name of the parameter
   *
   * @returns {String} Type of the parameter
   *
   */

	}, {
		key: 'getParamType',
		value: function getParamType(paramName) {
			var paramIndex = this.paramNames.indexOf(paramName);
			if (paramIndex === -1) {
				if (this.declarations.hasOwnProperty(paramName)) {
					return this.declarations[paramName];
				} else {
					return null;
				}
			} else {
				if (!this.parent) {
					if (this.paramTypes[paramIndex]) return this.paramTypes[paramIndex];
				} else {
					if (this.paramTypes[paramIndex]) return this.paramTypes[paramIndex];
					var calledFunctionArguments = this.parent.calledFunctionsArguments[this.functionName];
					for (var i = 0; i < calledFunctionArguments.length; i++) {
						var calledFunctionArgument = calledFunctionArguments[i];
						if (calledFunctionArgument[paramIndex] !== null) {
							return this.paramTypes[paramIndex] = calledFunctionArgument[paramIndex].type;
						}
					}
				}
			}
			return null;
		}

		/**
   * @memberOf FunctionNodeBase#
   * @function
   * @name getUserParamName
   *
   * @desc Return the name of the *user parameter*(subKernel parameter) corresponding 
   * to the parameter supplied to the kernel
   *
   * @param {String} paramName - Name of the parameter
   *
   * @returns {String} Name of the parameter
   *
   */

	}, {
		key: 'getUserParamName',
		value: function getUserParamName(paramName) {
			var paramIndex = this.paramNames.indexOf(paramName);
			if (paramIndex === -1) return null;
			if (!this.parent) return null;
			var calledFunctionArguments = this.parent.calledFunctionsArguments[this.functionName];
			for (var i = 0; i < calledFunctionArguments.length; i++) {
				var calledFunctionArgument = calledFunctionArguments[i];
				var param = calledFunctionArgument[paramIndex];
				if (param !== null && param.type !== 'Integer') {
					return param.name;
				}
			}
			return null;
		}
	}, {
		key: 'generate',
		value: function generate(options) {
			throw new Error('generate not defined on BaseFunctionNode');
		}

		/**
   * @memberOf FunctionNodeBase#
   * @function
   * @name astGeneric
   *
   * @desc Parses the abstract syntax tree for generically to its respective function
   *
   * @param {Object} ast - the AST object to parse
   * @param {Array} retArr - return array string
   *
   * @returns {Array} the parsed string array
   */

	}, {
		key: 'astGeneric',
		value: function astGeneric(ast, retArr) {
			if (ast === null) {
				throw this.astErrorOutput('NULL ast', ast);
			} else {
				if (Array.isArray(ast)) {
					for (var i = 0; i < ast.length; i++) {
						this.astGeneric(ast[i], retArr);
					}
					return retArr;
				}

				switch (ast.type) {
					case 'FunctionDeclaration':
						return this.astFunctionDeclaration(ast, retArr);
					case 'FunctionExpression':
						return this.astFunctionExpression(ast, retArr);
					case 'ReturnStatement':
						return this.astReturnStatement(ast, retArr);
					case 'Literal':
						return this.astLiteral(ast, retArr);
					case 'BinaryExpression':
						return this.astBinaryExpression(ast, retArr);
					case 'Identifier':
						return this.astIdentifierExpression(ast, retArr);
					case 'AssignmentExpression':
						return this.astAssignmentExpression(ast, retArr);
					case 'ExpressionStatement':
						return this.astExpressionStatement(ast, retArr);
					case 'EmptyStatement':
						return this.astEmptyStatement(ast, retArr);
					case 'BlockStatement':
						return this.astBlockStatement(ast, retArr);
					case 'IfStatement':
						return this.astIfStatement(ast, retArr);
					case 'BreakStatement':
						return this.astBreakStatement(ast, retArr);
					case 'ContinueStatement':
						return this.astContinueStatement(ast, retArr);
					case 'ForStatement':
						return this.astForStatement(ast, retArr);
					case 'WhileStatement':
						return this.astWhileStatement(ast, retArr);
					case 'DoWhileStatement':
						return this.astDoWhileStatement(ast, retArr);
					case 'VariableDeclaration':
						return this.astVariableDeclaration(ast, retArr);
					case 'VariableDeclarator':
						return this.astVariableDeclarator(ast, retArr);
					case 'ThisExpression':
						return this.astThisExpression(ast, retArr);
					case 'SequenceExpression':
						return this.astSequenceExpression(ast, retArr);
					case 'UnaryExpression':
						return this.astUnaryExpression(ast, retArr);
					case 'UpdateExpression':
						return this.astUpdateExpression(ast, retArr);
					case 'LogicalExpression':
						return this.astLogicalExpression(ast, retArr);
					case 'MemberExpression':
						return this.astMemberExpression(ast, retArr);
					case 'CallExpression':
						return this.astCallExpression(ast, retArr);
					case 'ArrayExpression':
						return this.astArrayExpression(ast, retArr);
					case 'DebuggerStatement':
						return this.astDebuggerStatement(ast, retArr);
				}

				throw this.astErrorOutput('Unknown ast type : ' + ast.type, ast);
			}
		}
		/**
   * @function
   * @name astErrorOutput
   * @ignore
   * @desc To throw the AST error, with its location.
   *
   * @todo add location support fpr the AST error
   *
   * @param {Object} error - the error message output
   * @param {Object} ast - the AST object where the error is
   */

	}, {
		key: 'astErrorOutput',
		value: function astErrorOutput(error, ast) {
			console.error(utils.getAstString(this.jsFunctionString, ast));
			console.error(error, ast, this);
			return error;
		}
	}, {
		key: 'astDebuggerStatement',
		value: function astDebuggerStatement(arrNode, retArr) {
			return retArr;
		}
	}, {
		key: 'astFunctionDeclaration',
		value: function astFunctionDeclaration(ast, retArr) {
			return retArr;
		}
	}, {
		key: 'astFunctionExpression',
		value: function astFunctionExpression(ast, retArr) {
			return retArr;
		}
	}, {
		key: 'astReturnStatement',
		value: function astReturnStatement(ast, retArr) {
			return retArr;
		}
	}, {
		key: 'astLiteral',
		value: function astLiteral(ast, retArr) {
			return retArr;
		}
	}, {
		key: 'astBinaryExpression',
		value: function astBinaryExpression(ast, retArr) {
			return retArr;
		}
	}, {
		key: 'astIdentifierExpression',
		value: function astIdentifierExpression(ast, retArr) {
			return retArr;
		}
	}, {
		key: 'astAssignmentExpression',
		value: function astAssignmentExpression(ast, retArr) {
			return retArr;
		}
	}, {
		key: 'astExpressionStatement',
		value: function astExpressionStatement(ast, retArr) {
			return retArr;
		}
	}, {
		key: 'astEmptyStatement',
		value: function astEmptyStatement(ast, retArr) {
			return retArr;
		}
	}, {
		key: 'astBlockStatement',
		value: function astBlockStatement(ast, retArr) {
			return retArr;
		}
	}, {
		key: 'astIfStatement',
		value: function astIfStatement(ast, retArr) {
			return retArr;
		}
	}, {
		key: 'astBreakStatement',
		value: function astBreakStatement(ast, retArr) {
			return retArr;
		}
	}, {
		key: 'astContinueStatement',
		value: function astContinueStatement(ast, retArr) {
			return retArr;
		}
	}, {
		key: 'astForStatement',
		value: function astForStatement(ast, retArr) {
			return retArr;
		}
	}, {
		key: 'astWhileStatement',
		value: function astWhileStatement(ast, retArr) {
			return retArr;
		}
	}, {
		key: 'astDoWhileStatement',
		value: function astDoWhileStatement(ast, retArr) {
			return retArr;
		}
	}, {
		key: 'astVariableDeclaration',
		value: function astVariableDeclaration(ast, retArr) {
			return retArr;
		}
	}, {
		key: 'astVariableDeclarator',
		value: function astVariableDeclarator(ast, retArr) {
			return retArr;
		}
	}, {
		key: 'astThisExpression',
		value: function astThisExpression(ast, retArr) {
			return retArr;
		}
	}, {
		key: 'astSequenceExpression',
		value: function astSequenceExpression(ast, retArr) {
			return retArr;
		}
	}, {
		key: 'astUnaryExpression',
		value: function astUnaryExpression(ast, retArr) {
			return retArr;
		}
	}, {
		key: 'astUpdateExpression',
		value: function astUpdateExpression(ast, retArr) {
			return retArr;
		}
	}, {
		key: 'astLogicalExpression',
		value: function astLogicalExpression(ast, retArr) {
			return retArr;
		}
	}, {
		key: 'astMemberExpression',
		value: function astMemberExpression(ast, retArr) {
			return retArr;
		}
	}, {
		key: 'astCallExpression',
		value: function astCallExpression(ast, retArr) {
			return retArr;
		}
	}, {
		key: 'astArrayExpression',
		value: function astArrayExpression(ast, retArr) {
			return retArr;
		}

		/**
   * @ignore
   * @function
   * @name pushParameter
   *
   * @desc [INTERNAL] pushes a fn parameter onto retArr and 'casts' to int if necessary
   *  i.e. deal with force-int-parameter state
   * 			
   * @param {Array} retArr - return array string
   * @param {String} parameter - the parameter name  
   *
   */

	}, {
		key: 'pushParameter',
		value: function pushParameter(retArr, parameter) {
			if (this.isState('in-get-call-parameters')) {
				retArr.push('int(' + parameter + ')');
			} else {
				retArr.push(parameter);
			}
		}
	}, {
		key: 'state',
		get: function get() {
			return this.states[this.states.length - 1];
		}
	}]);

	return BaseFunctionNode;
}();