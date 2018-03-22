'use strict';

const BaseFunctionNode = require('../function-node-base');
const utils = require('../../core/utils');

/**
 * @class CPUFunctionNode
 * 
 * @extends BaseFunctionNode
 *
 * @desc [INTERNAL] Represents a single function, inside JS
 *
 * <p>This handles all the raw state, converted state, etc. Of a single function.</p>
 *
 * @prop functionName         - {String}        Name of the function
 * @prop jsFunction           - {Function}   The JS Function the node represents
 * @prop jsFunctionString     - {String}        jsFunction.toString()
 * @prop paramNames           - {String[]}  Parameter names of the function
 * @prop paramTypes           - {String[]}  Shader land parameters type assumption
 * @prop isRootKernel         - {Boolean}       Special indicator, for kernel function
 * @prop webglFunctionString  - {String}        webgl converted function string
 * @prop openglFunctionString - {String}        opengl converted function string
 * @prop calledFunctions      - {String[]}  List of all the functions called
 * @prop initVariables        - {String[]}  List of variables initialized in the function
 * @prop readVariables        - {String[]}  List of variables read operations occur
 * @prop writeVariables       - {String[]}  List of variables write operations occur
 *
 */
module.exports = class CPUFunctionNode extends BaseFunctionNode {
	generate() {
		if (this.debug) {
			console.log(this);
		}
		this.functionStringArray = this.astGeneric(this.getJsAST(), [], this);
		this.functionString = this.functionStringArray.join('').trim();
		return this.functionString;
	}

	/**
	 * @memberOf CPUFunctionNode#
	 * @function
	 * @name getFunctionPrototypeString
	 *
	 * @desc Returns the converted JS function
	 *
	 * @returns {String} function string, result is cached under this.getFunctionPrototypeString
	 *
	 */
	getFunctionPrototypeString() {
		if (this.webGlFunctionPrototypeString) {
			return this.webGlFunctionPrototypeString;
		}
		return this.webGlFunctionPrototypeString = this.generate();
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
	 * @returns {Array} the parsed cpu string array
	 */
	astGeneric(ast, retArr, funcParam) {
		if (ast === null) {
			throw this.astErrorOutput('NULL ast', ast, funcParam);
		} else {
			if (Array.isArray(ast)) {
				for (let i = 0; i < ast.length; i++) {
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
	astFunctionDeclaration(ast, retArr, funcParam) {
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
	static astFunctionPrototype(ast, retArr, funcParam) {
		// Setup function return type and name
		if (funcParam.isRootKernel || funcParam.isSubKernel) {
			return retArr;
		}

		retArr.push(funcParam.returnType);
		retArr.push(' ');
		retArr.push(funcParam.functionName);
		retArr.push('(');

		// Arguments handling
		for (let i = 0; i < funcParam.paramNames.length; ++i) {
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
	astFunctionExpression(ast, retArr, funcParam) {

		// Setup function return type and name
		if (!funcParam.isRootKernel) {
			retArr.push('function');
			funcParam.kernalAst = ast;
			retArr.push(' ');
			retArr.push(funcParam.functionName);
			retArr.push('(');

			// Arguments handling
			for (let i = 0; i < funcParam.paramNames.length; ++i) {
				const paramName = funcParam.paramNames[i];

				if (i > 0) {
					retArr.push(', ');
				}

				retArr.push(' ');
				retArr.push('user_');
				retArr.push(paramName);
			}

			// Function opening
			retArr.push(') {\n');
		}

		// Body statement iteration
		for (let i = 0; i < ast.body.body.length; ++i) {
			this.astGeneric(ast.body.body[i], retArr, funcParam);
			retArr.push('\n');
		}

		if (!funcParam.isRootKernel) {
			// Function closing
			retArr.push('}\n');
		}
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
	astReturnStatement(ast, retArr, funcParam) {
		if (funcParam.isRootKernel) {
			retArr.push('kernelResult = ');
			this.astGeneric(ast.argument, retArr, funcParam);
			retArr.push(';');
		} else if (funcParam.isSubKernel) {
			retArr.push(`${ funcParam.functionName }Result = `);
			this.astGeneric(ast.argument, retArr, funcParam);
			retArr.push(';');
			retArr.push(`return ${ funcParam.functionName }Result;`);
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
	astLiteral(ast, retArr, funcParam) {

		// Reject non numeric literals
		if (isNaN(ast.value)) {
			throw this.astErrorOutput(
				'Non-numeric literal not supported : ' + ast.value,
				ast, funcParam
			);
		}

		retArr.push(ast.value);

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
	astBinaryExpression(ast, retArr, funcParam) {
		retArr.push('(');
		this.astGeneric(ast.left, retArr, funcParam);
		retArr.push(ast.operator);
		this.astGeneric(ast.right, retArr, funcParam);
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
	astIdentifierExpression(idtNode, retArr, funcParam) {
		if (idtNode.type !== 'Identifier') {
			throw this.astErrorOutput(
				'IdentifierExpression - not an Identifier',
				idtNode, funcParam
			);
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
					const userParamName = funcParam.getUserParamName(idtNode.name);
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
	 * @returns {Array} the parsed cpu string
	 */
	astForStatement(forNode, retArr, funcParam) {
		if (forNode.type !== 'ForStatement') {
			throw this.astErrorOutput(
				'Invalid for statment',
				forNode, funcParam
			);
		}

		if (forNode.test && forNode.test.type === 'BinaryExpression') {
			if ((forNode.test.right.type === 'Identifier' || forNode.test.right.type === 'Literal') &&
				forNode.test.operator === '<' &&
				this.isIdentifierConstant(forNode.test.right.name) === false) {

				if (!this.loopMaxIterations) {
					console.warn('Warning: loopMaxIterations is not set! Using default of 1000 which may result in unintended behavior.');
					console.warn('Set loopMaxIterations or use a for loop of fixed length to silence this message.');
				}

				retArr.push('for (');
				this.astGeneric(forNode.init, retArr, funcParam);
				if (retArr[retArr.length - 1] !== ';') {
					retArr.push(';');
				}
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
					for (let i = 0; i < forNode.body.body.length; i++) {
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
			} else if (forNode.init.declarations) {
				const declarations = JSON.parse(JSON.stringify(forNode.init.declarations));
				const updateArgument = forNode.update.argument;
				if (!Array.isArray(declarations) || declarations.length < 1) {
					console.log(this.jsFunctionString);
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
							retArr.push('var ');
							this.astGeneric(declaration, retArr, funcParam);
							retArr.push(';');
						}
					}

					retArr.push('for (let ');
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

		throw this.astErrorOutput(
			'Invalid for statement',
			forNode, funcParam
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
	 * @param {Function} funcParam - FunctionNode, that tracks compilation state
	 *
	 * @returns {Array} the parsed openclgl string
	 */
	astWhileStatement(whileNode, retArr, funcParam) {
		if (whileNode.type !== 'WhileStatement') {
			throw this.astErrorOutput(
				'Invalid while statment',
				whileNode, funcParam
			);
		}

		retArr.push('for (let i = 0; i < LOOP_MAX; i++) {');
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
	astAssignmentExpression(assNode, retArr, funcParam) {
		this.astGeneric(assNode.left, retArr, funcParam);
		retArr.push(assNode.operator);
		this.astGeneric(assNode.right, retArr, funcParam);
		return retArr;
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
	astEmptyStatement(eNode, retArr, funcParam) {
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
	 * @param {Function} funcParam - FunctionNode, that tracks compilation state
	 *
	 * @returns {Array} the append retArr
	 */
	astBlockStatement(bNode, retArr, funcParam) {
		retArr.push('{\n');
		for (let i = 0; i < bNode.body.length; i++) {
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
	astExpressionStatement(esNode, retArr, funcParam) {
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
	astVariableDeclaration(vardecNode, retArr, funcParam) {
		retArr.push('var ');
		for (let i = 0; i < vardecNode.declarations.length; i++) {
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
	astVariableDeclarator(ivardecNode, retArr, funcParam) {
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
	astIfStatement(ifNode, retArr, funcParam) {
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
	astBreakStatement(brNode, retArr, funcParam) {
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
	astContinueStatement(crNode, retArr, funcParam) {
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
	astLogicalExpression(logNode, retArr, funcParam) {
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
	astUpdateExpression(uNode, retArr, funcParam) {
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
	astUnaryExpression(uNode, retArr, funcParam) {
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
	astThisExpression(tNode, retArr, funcParam) {
		retArr.push('_this');
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
	astMemberExpression(mNode, retArr, funcParam) {
		if (mNode.computed) {
			if (mNode.object.type === 'Identifier') {
				this.astGeneric(mNode.object, retArr, funcParam);
				retArr.push('[');
				this.astGeneric(mNode.property, retArr, funcParam);
				retArr.push(']');
			} else {
				this.astGeneric(mNode.object, retArr, funcParam);
				const last = retArr.pop();
				retArr.push('][');
				this.astGeneric(mNode.property, retArr, funcParam);
				retArr.push(last);
			}
		} else {
			let unrolled = this.astMemberExpressionUnroll(mNode);
			if (mNode.property.type === 'Identifier' && mNode.computed) {
				unrolled = 'user_' + unrolled;
			}

			// Its a reference to `this`, add '_' before
			if (unrolled.indexOf('this') === 0) {
				unrolled = '_' + unrolled;
			}

			switch (unrolled) {
				case '_this.output.x':
					retArr.push(this.output[0]);
					break;
				case '_this.output.y':
					retArr.push(this.output[1]);
					break;
				case '_this.output.z':
					retArr.push(this.output[2]);
					break;
				default:
					retArr.push(unrolled);
			}
		}
		return retArr;
	}

	astSequenceExpression(sNode, retArr, funcParam) {
		for (let i = 0; i < sNode.expressions.length; i++) {
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
	astCallExpression(ast, retArr, funcParam) {
		if (ast.callee) {
			// Get the full function call, unrolled
			let funcName = this.astMemberExpressionUnroll(ast.callee);

			// Register the function into the called registry
			if (funcParam.calledFunctions.indexOf(funcName) < 0) {
				funcParam.calledFunctions.push(funcName);
			}
			if (!funcParam.hasOwnProperty('funcName')) {
				funcParam.calledFunctionsArguments[funcName] = [];
			}

			const functionArguments = [];
			funcParam.calledFunctionsArguments[funcName].push(functionArguments);

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
				this.astGeneric(argument, retArr, funcParam);
				if (argument.type === 'Identifier') {
					const paramIndex = funcParam.paramNames.indexOf(argument.name);
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
		throw this.astErrorOutput(
			'Unknown CallExpression',
			ast, funcParam
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
	 * @param {Object} arrNode - the AST object to parse
	 * @param {Array} retArr - return array string
	 * @param {Function} funcParam - FunctionNode, that tracks compilation state
	 *
	 * @returns {Array} the append retArr
	 */
	astArrayExpression(arrNode, retArr, funcParam) {
		const arrLen = arrNode.elements.length;

		retArr.push('new Float32Array(');
		for (let i = 0; i < arrLen; ++i) {
			if (i > 0) {
				retArr.push(', ');
			}
			const subNode = arrNode.elements[i];
			this.astGeneric(subNode, retArr, funcParam)
		}
		retArr.push(')');

		return retArr;

		// // Failure, unknown expression
		// throw this.astErrorOutput(
		// 	'Unknown  ArrayExpression',
		// 	arrNode, funcParam
		//);
	}

	astDebuggerStatement(arrNode, retArr, funcParam) {
		retArr.push('debugger;');
		return retArr;
	}
};