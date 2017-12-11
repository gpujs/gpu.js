'use strict';

const utils = require('../core/utils');
const acorn = require('acorn');

module.exports = class BaseFunctionNode {

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
	 * @prop {String[]} initVariables - List of variables initialized in the function
	 * @prop {String[]} readVariables - List of variables read operations occur
	 * @prop {String[]} writeVariables - List of variables write operations occur
	 * 
	 * @param {GPU} gpu - The GPU instance
	 * @param {String} functionName - Function name to assume, if its null, it attempts to extract from the function
	 * @param {Function|String} jsFunction - JS Function to do conversion
	 * @param {String[]|Object} paramTypes - Parameter type array, assumes all parameters are 'float' if null
	 * @param {String} returnType - The return type, assumes 'float' if null
	 *
	 */
	constructor(functionName, jsFunction, options, paramTypes, returnType) {
		//
		// Internal vars setup
		//
		this.calledFunctions = [];
		this.calledFunctionsArguments = {};
		this.initVariables = [];
		this.readVariables = [];
		this.writeVariables = [];
		this.addFunction = null;
		this.isRootKernel = false;
		this.isSubKernel = false;
		this.parent = null;
		this.debug = null;
		this.prototypeOnly = null;
		this.constants = null;
		this.output = null;
		this.plugins = new Set([]);

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
		this.functionName = functionName ||
			(jsFunction && jsFunction.name) ||
			utils.getFunctionNameFromString(this.jsFunctionString);

		if (!(this.functionName)) {
			throw 'jsFunction, missing name argument or value';
		}

		//
		// Extract parameter name, and its argument types
		//
		this.paramNames = utils.getParamNamesFromString(this.jsFunctionString);
		if (paramTypes) {
			if (Array.isArray(paramTypes)) {
				if (paramTypes.length !== this.paramNames.length) {
					throw 'Invalid argument type array length, against function length -> (' +
						paramTypes.length + ',' +
						this.paramNames.length +
						')';
				}
				this.paramTypes = paramTypes;
			} else if (typeof paramTypes === 'object') {
				const paramVariableNames = Object.keys(paramTypes);
				if (paramTypes.hasOwnProperty('returns')) {
					this.returnType = paramTypes.returns;
					paramVariableNames.splice(paramVariableNames.indexOf('returns'), 1);
				}
				if (paramVariableNames.length > 0 && paramVariableNames.length !== this.paramNames.length) {
					throw 'Invalid argument type array length, against function length -> (' +
						paramVariableNames.length + ',' +
						this.paramNames.length +
						')';
				} else {
					this.paramTypes = this.paramNames.map((key) => {
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
			//TODO: Remove when we have proper type detection
			// for (let a = 0; a < this.paramNames.length; ++a) {
			// 	this.paramTypes.push();
			// }
		}

		//
		// Return type handling
		//
		if (!this.returnType) {
			this.returnType = returnType || 'float';
		}
	}

	isIdentifierConstant(paramName) {
		if (!this.constants) return false;
		return this.constants.hasOwnProperty(paramName);
	}

	setAddFunction(fn) {
		this.addFunction = fn;
		return this;
	}
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
	getJsFunction() {
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
	 * @param {Function} funcParam - FunctionNode, that tracks compilation state
	 *
	 * @returns {String} the function namespace call, unrolled
	 */
	astMemberExpressionUnroll(ast, funcParam) {
		if (ast.type === 'Identifier') {
			return ast.name;
		} else if (ast.type === 'ThisExpression') {
			return 'this';
		}

		if (ast.type === 'MemberExpression') {
			if (ast.object && ast.property) {
				//babel sniffing
				if (ast.object.hasOwnProperty('name') && ast.object.name[0] === '_') {
					return this.astMemberExpressionUnroll(ast.property, funcParam);
				}

				return (
					this.astMemberExpressionUnroll(ast.object, funcParam) +
					'.' +
					this.astMemberExpressionUnroll(ast.property, funcParam)
				);
			}
		}

		//babel sniffing
		if (ast.hasOwnProperty('expressions')) {
			const firstExpression = ast.expressions[0];
			if (firstExpression.type === 'Literal' && firstExpression.value === 0 && ast.expressions.length === 2) {
				return this.astMemberExpressionUnroll(ast.expressions[1]);
			}
		}

		// Failure, unknown expression
		throw this.astErrorOutput(
			'Unknown CallExpression_unroll',
			ast, funcParam
		);
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
	 * @param {JISONParser} inParser - Parser to use, assumes in scope 'parser' if null
	 *
	 * @returns {ASTObject} The function AST Object, note that result is cached under this.jsFunctionAST;
	 *
	 */
	getJsAST(inParser) {
		if (this.jsFunctionAST) {
			return this.jsFunctionAST;
		}

		inParser = inParser || acorn;
		if (inParser === null) {
			throw 'Missing JS to AST parser';
		}

		const ast = inParser.parse('var ' + this.functionName + ' = ' + this.jsFunctionString + ';', {
			locations: true
		});
		if (ast === null) {
			throw 'Failed to parse JS code';
		}

		// take out the function object, outside the var declarations
		const funcAST = ast.body[0].declarations[0].init;
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
	getFunctionString() {
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
	setFunctionString(functionString) {
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
	getParamType(paramName) {
		const paramIndex = this.paramNames.indexOf(paramName);
		if (paramIndex === -1) return null;
		if (!this.parent) return null;
		if (this.paramTypes[paramIndex]) return this.paramTypes[paramIndex];
		const calledFunctionArguments = this.parent.calledFunctionsArguments[this.functionName];
		for (let i = 0; i < calledFunctionArguments.length; i++) {
			const calledFunctionArgument = calledFunctionArguments[i];
			if (calledFunctionArgument[paramIndex] !== null) {
				return this.paramTypes[paramIndex] = calledFunctionArgument[paramIndex].type;
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
	getUserParamName(paramName) {
		const paramIndex = this.paramNames.indexOf(paramName);
		if (paramIndex === -1) return null;
		if (!this.parent) return null;
		const calledFunctionArguments = this.parent.calledFunctionsArguments[this.functionName];
		for (let i = 0; i < calledFunctionArguments.length; i++) {
			const calledFunctionArgument = calledFunctionArguments[i];
			if (calledFunctionArgument[paramIndex] !== null) {
				return calledFunctionArgument[paramIndex].name;
			}
		}
		return null;
	}

	generate(options) {
		throw new Error('generate not defined on BaseFunctionNode');
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
	 * @param {Object} funcParam - FunctionNode, that tracks compilation state
	 */
	astErrorOutput(error, ast, funcParam) {
		console.error(utils.getAstString(this.jsFunctionString, ast));
		console.error(error, ast, funcParam);
		return error;
	}

	astDebuggerStatement(arrNode, retArr, funcParam) {
		return retArr;
	}
};