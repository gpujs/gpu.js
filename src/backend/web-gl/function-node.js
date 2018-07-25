'use strict';

const FunctionNodeBase = require('../function-node-base');
const utils = require('../../core/utils');
// Closure capture for the ast function, prevent collision with existing AST functions
// The prefixes to use
const jsMathPrefix = 'Math.';
const localPrefix = 'this.';
const constantsPrefix = 'this.constants.';

const DECODE32_ENCODE32 = /decode32\(\s+encode32\(/g;
const ENCODE32_DECODE32 = /encode32\(\s+decode32\(/g;

// these debugs were hugely usefull...
// TODO: optimise out - webpack/babel options? maybe some generic logging support in core/utils?
// const debugLog = console.log
const debugLog = () => {};
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
module.exports = class WebGLFunctionNode extends FunctionNodeBase {
	generate() {
		if (this.debug) {
			debugLog(this);
		}
		if (this.prototypeOnly) {
			return WebGLFunctionNode.astFunctionPrototype(this.getJsAST(), [], this).join('').trim();
		} else {
			this.functionStringArray = this.astGeneric(this.getJsAST(), [], this);
		}
		this.functionString = webGlRegexOptimize(
			this.functionStringArray.join('').trim()
		);
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
	astFunctionDeclaration(ast, retArr) {
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
	static astFunctionPrototype(ast, retArr) {
		// Setup function return type and name
		if (this.isRootKernel || this.isSubKernel) {
			return retArr;
		}

		retArr.push(this.returnType);
		retArr.push(' ');
		retArr.push(this.functionName);
		retArr.push('(');

		// Arguments handling
		for (let i = 0; i < this.paramNames.length; ++i) {
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
	astFunctionExpression(ast, retArr) {

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
			for (let i = 0; i < this.paramNames.length; ++i) {
				const paramName = this.paramNames[i];

				if (i > 0) {
					retArr.push(', ');
				}
				const type = this.getParamType(paramName);
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
		for (let i = 0; i < ast.body.body.length; ++i) {
			this.astGeneric(ast.body.body[i], retArr);
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
	astReturnStatement(ast, retArr) {
		if (this.isRootKernel) {
			retArr.push('kernelResult = ');
			this.astGeneric(ast.argument, retArr);
			retArr.push(';');
			retArr.push('return;');
		} else if (this.isSubKernel) {
			retArr.push(`${ this.functionName }Result = `);
			this.astGeneric(ast.argument, retArr);
			retArr.push(';');
			retArr.push(`return ${ this.functionName }Result;`);
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
	astLiteral(ast, retArr) {

		// Reject non numeric literals
		if (isNaN(ast.value)) {
			throw this.astErrorOutput(
				'Non-numeric literal not supported : ' + ast.value,
				ast
			);
		}

		// Push the literal value as a float/int
		retArr.push(ast.value);

		const inGetParams = this.isState('in-get-call-parameters');
		// If it was an int, node made a float if necessary
		if (Number.isInteger(ast.value)) {
			if (!inGetParams) {
				retArr.push('.0');
			}
		} else if (this.isState('in-get-call-parameters')) {
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
	astBinaryExpression(ast, retArr) {
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
			retArr.push(', ')
			this.astGeneric(ast.right, retArr);
			retArr.push(')');
		} else {
			this.astGeneric(ast.left, retArr);
			retArr.push(ast.operator);
			this.astGeneric(ast.right, retArr);
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
	 *
	 * @returns {Array} the append retArr
	 */
	astIdentifierExpression(idtNode, retArr) {
		if (idtNode.type !== 'Identifier') {
			throw this.astErrorOutput(
				'IdentifierExpression - not an Identifier',
				idtNode
			);
		}
		// do we need to cast addressing vales to float?
		const castFloat = !this.isState('in-get-call-parameters');

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
					const userParamName = this.getUserParamName(idtNode.name);
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
	astForStatement(forNode, retArr) {
		if (forNode.type !== 'ForStatement') {
			throw this.astErrorOutput(
				'Invalid for statment',
				forNode
			);
		}

		if (forNode.test && forNode.test.type === 'BinaryExpression') {
			if (forNode.test.right.type === 'Identifier' &&
				forNode.test.operator === '<' &&
				this.isIdentifierConstant(forNode.test.right.name) === false) {

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
					for (let i = 0; i < forNode.body.body.length; i++) {
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
				const declarations = JSON.parse(JSON.stringify(forNode.init.declarations));
				const updateArgument = forNode.update.argument;
				if (!Array.isArray(declarations) || declarations.length < 1) {
					debugLog(this.jsFunctionString);
					throw new Error('Error: Incompatible for loop declaration');
				}

				if (declarations.length > 1) {
					let initArgument = null;
					for (let i = 0; i < declarations.length; i++) {
						const declaration = declarations[i];
						if (declaration.id.name === updateArgument.name) {
							initArgument = declaration;
							declarations.splice(i, 1);
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

		throw this.astErrorOutput(
			'Invalid for statement',
			forNode
		);
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
	astWhileStatement(whileNode, retArr) {
		if (whileNode.type !== 'WhileStatement') {
			throw this.astErrorOutput(
				'Invalid while statment',
				whileNode
			);
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
	astDoWhileStatement(doWhileNode, retArr) {
		if (doWhileNode.type !== 'DoWhileStatement') {
			throw this.astErrorOutput(
				'Invalid while statment',
				doWhileNode
			);
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
	astAssignmentExpression(assNode, retArr) {
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
	astEmptyStatement(eNode, retArr) {
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
	astBlockStatement(bNode, retArr) {
		retArr.push('{\n');
		for (let i = 0; i < bNode.body.length; i++) {
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
	astExpressionStatement(esNode, retArr) {
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
	astVariableDeclaration(vardecNode, retArr) {
		for (let i = 0; i < vardecNode.declarations.length; i++) {
			const declaration = vardecNode.declarations[i];
			if (i > 0) {
				retArr.push(',');
			}
			const retDeclaration = [];
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
	astVariableDeclarator(ivardecNode, retArr) {
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
	astIfStatement(ifNode, retArr) {
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
	astBreakStatement(brNode, retArr) {
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
	astContinueStatement(crNode, retArr) {
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
	astLogicalExpression(logNode, retArr) {
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
	astUpdateExpression(uNode, retArr) {
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
	astUnaryExpression(uNode, retArr) {
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
	astThisExpression(tNode, retArr) {
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
	astMemberExpression(mNode, retArr) {
		debugLog("[in] astMemberExpression " + mNode.object.type);
		if (mNode.computed) {
			if (mNode.object.type === 'Identifier') {
				// Working logger
				const reqName = mNode.object.name;
				const funcName = this.functionName || 'kernel';
				let assumeNotTexture = false;

				// Possibly an array request - handle it as such
				if (this.paramNames) {
					const idx = this.paramNames.indexOf(reqName);
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
					const isInGetParams = this.isState('in-get-call-parameters');
					const multiMemberExpression = this.isState('multi-member-expression');
					if (multiMemberExpression) {
						this.popState('multi-member-expression');
					}
					this.pushState('not-in-get-call-parameters');

					// This normally refers to the global read only input vars
					switch (this.getParamType(mNode.object.name)) {
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
				const stateStackDepth = this.states.length;
				const startedInGetParamsState = this.isState('in-get-call-parameters');
				if (!startedInGetParamsState) {
					this.pushState('multi-member-expression');
				}
				this.astGeneric(mNode.object, retArr);
				if (this.isState('multi-member-expression')) {
					this.popState('multi-member-expression');
				}
				const changedGetParamsState = !startedInGetParamsState && this.isState('in-get-call-parameters');
				const last = retArr.pop();
				retArr.push(',');
				debugLog("- astMemberExpression prop:", mNode.property);
				const shouldPopParamState = this.isState('should-pop-in-get-call-parameters');
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
					this.popState('in-get-call-parameters')
				}
			}
		} else {

			// Unroll the member expression
			let unrolled = this.astMemberExpressionUnroll(mNode);
			let unrolled_lc = unrolled.toLowerCase();
			debugLog("- astMemberExpression unrolled:", unrolled);
			// Its a constant, remove this.constants.
			if (unrolled.indexOf(constantsPrefix) === 0) {
				unrolled = 'constants_' + unrolled.slice(constantsPrefix.length);
			}

			// do we need to cast addressing vales to float?
			const castFloat = !this.isState('in-get-call-parameters');

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
					retArr.push(unrolled);
			}
		}
		debugLog("[out] astMemberExpression " + mNode.object.type);
		return retArr;
	}

	astSequenceExpression(sNode, retArr) {
		for (let i = 0; i < sNode.expressions.length; i++) {
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
	astCallExpression(ast, retArr) {
		if (ast.callee) {
			// Get the full function call, unrolled
			let funcName = this.astMemberExpressionUnroll(ast.callee);

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

			const functionArguments = [];
			this.calledFunctionsArguments[funcName].push(functionArguments);

			// Call the function
			retArr.push(funcName);

			// Open arguments space
			retArr.push('(');

			// Add the vars
			for (let i = 0; i < ast.arguments.length; ++i) {
				const argument = ast.arguments[i];
				if (i > 0) {
					retArr.push(', ');
				}
				this.astGeneric(argument, retArr);
				if (argument.type === 'Identifier') {
					const paramIndex = this.paramNames.indexOf(argument.name);
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
		throw this.astErrorOutput(
			'Unknown CallExpression',
			ast
		);

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
	astArrayExpression(arrNode, retArr) {
		const arrLen = arrNode.elements.length;

		retArr.push('float[' + arrLen + '](');
		for (let i = 0; i < arrLen; ++i) {
			if (i > 0) {
				retArr.push(', ');
			}
			const subNode = arrNode.elements[i];
			this.astGeneric(subNode, retArr)
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
	getFunctionPrototypeString() {
		if (this.webGlFunctionPrototypeString) {
			return this.webGlFunctionPrototypeString;
		}
		return this.webGlFunctionPrototypeString = this.generate();
	}

	build() {
		return this.getFunctionPrototypeString().length > 0;
	}
};

function isIdentifierKernelParam(paramName, ast, funcParam) {
	return funcParam.paramNames.indexOf(paramName) !== -1;
}

function ensureIndentifierType(paramName, expectedType, ast, funcParam) {
	const start = ast.loc.start;

	if (!isIdentifierKernelParam(paramName) && expectedType !== 'float') {
		throw new Error('Error unexpected identifier ' + paramName + ' on line ' + start.line);
	} else {
		const actualType = funcParam.paramTypes[funcParam.paramNames.indexOf(paramName)];
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
	return inStr
		.replace(DECODE32_ENCODE32, '((')
		.replace(ENCODE32_DECODE32, '((');
}