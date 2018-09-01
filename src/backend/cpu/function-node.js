'use strict';

const BaseFunctionNode = require('../function-node-base');
const utils = require('../../core/utils');

/**
 * @class CPUFunctionNode
 *
 * @extends BaseFunctionNode#
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
	constructor(functionName, jsFunction, options) {
		super(functionName, jsFunction, options);
		this.paramSizes = options ? options.paramSizes : [];
		this.memberStates = [];
	}

	get memberState() {
		return this.memberStates[this.memberStates.length - 1];
	}

	pushMemberState(name) {
		this.memberStates.push(name);
	}

	popMemberState(name) {
		if (this.memberState === name) {
			this.memberStates.pop();
		} else {
			throw new Error(`Cannot popMemberState ${ name } when in ${ this.memberState }`)
		}
	}

	generate() {
		if (this.debug) {
			console.log(this);
		}
		this.functionStringArray = this.astGeneric(this.getJsAST(), []);
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
	 * @memberOf CPUFunctionNode#
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
	 * @memberOf CPUFunctionNode#
	 * @function
	 * @name astFunctionPrototype
	 *
	 * @desc Parses the abstract syntax tree for to its *named function prototype*
	 *
	 * @param {Object} ast - the AST object to parse
	 * @param {Array} retArr - return array string
	 *
	 * @returns {Array} the append retArr
	 */
	astFunctionPrototype(ast, retArr) {
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
	 * @memberOf CPUFunctionNode#
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
		if (!this.isRootKernel) {
			retArr.push('function');
			this.kernalAst = ast;
			retArr.push(' ');
			retArr.push(this.functionName);
			retArr.push('(');

			// Arguments handling
			for (let i = 0; i < this.paramNames.length; ++i) {
				const paramName = this.paramNames[i];

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
			this.astGeneric(ast.body.body[i], retArr);
			retArr.push('\n');
		}

		if (!this.isRootKernel) {
			// Function closing
			retArr.push('}\n');
		}
		return retArr;
	}

	/**
	 * @memberOf CPUFunctionNode#
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
	 * @memberOf CPUFunctionNode#
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

		retArr.push(ast.value);

		return retArr;
	}

	/**
	 * @memberOf CPUFunctionNode#
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
		this.astGeneric(ast.left, retArr);
		retArr.push(ast.operator);
		this.astGeneric(ast.right, retArr);
		retArr.push(')');
		return retArr;
	}

	/**
	 * @memberOf CPUFunctionNode#
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

		switch (this.state) {
			case 'input-index-y':
			case 'input-index-z':
				retArr.push('(');
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
			case 'Infinity':
				retArr.push('Infinity');
				break;
			default:
				if (this.constants && this.constants.hasOwnProperty(idtNode.name)) {
					retArr.push('constants_' + idtNode.name);
				} else {
					const userParamName = this.getUserParamName(idtNode.name);
					if (userParamName !== null) {
						retArr.push('user_' + userParamName);
					} else {
						retArr.push('user_' + idtNode.name);
					}
				}
		}

		switch (this.state) {
			case 'input-index-y':
				{
					const size = this.paramSizes[this.paramNames.indexOf(this.memberState)];
					retArr.push(' * ' + size[0] + ')');
					break;
				}
			case 'input-index-z':
				{
					const size = this.paramSizes[this.paramNames.indexOf(this.memberState)];
					retArr.push(' * ' + size[0] * size[1] + ')');
					break;
				}
		}

		return retArr;
	}

	/**
	 * @memberOf CPUFunctionNode#
	 * @function
	 * @name astForStatement
	 *
	 * @desc Parses the abstract syntax tree forfor *for-loop* expression
	 *
	 * @param {Object} forNode - An ast Node
	 * @param {Array} retArr - return array string
	 *
	 * @returns {Array} the parsed cpu string
	 */
	astForStatement(forNode, retArr) {
		if (forNode.type !== 'ForStatement') {
			throw this.astErrorOutput(
				'Invalid for statement',
				forNode
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
				this.astGeneric(forNode.init, retArr);
				if (retArr[retArr.length - 1] !== ';') {
					retArr.push(';');
				}
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
							this.astGeneric(declaration, retArr);
							retArr.push(';');
						}
					}

					retArr.push('for (let ');
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
	 * @memberOf CPUFunctionNode#
	 * @function
	 * @name astWhileStatement
	 *
	 * @desc Parses the abstract syntax tree for *while* loop
	 *
	 *
	 * @param {Object} whileNode - An ast Node
	 * @param {Array} retArr - return array string
	 *
	 * @returns {Array} the parsed openclgl string
	 */
	astWhileStatement(whileNode, retArr) {
		if (whileNode.type !== 'WhileStatement') {
			throw this.astErrorOutput(
				'Invalid while statement',
				whileNode
			);
		}

		retArr.push('for (let i = 0; i < LOOP_MAX; i++) {');
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
	 * @memberOf CPUFunctionNode#
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
				'Invalid while statement',
				doWhileNode
			);
		}

		retArr.push('for (let i = 0; i < LOOP_MAX; i++) {');
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
	 * @memberOf CPUFunctionNode#
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
		this.astGeneric(assNode.left, retArr);
		retArr.push(assNode.operator);
		this.astGeneric(assNode.right, retArr);
		return retArr;
	}

	/**
	 * @memberOf CPUFunctionNode#
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
	 * @memberOf CPUFunctionNode#
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
	 * @memberOf CPUFunctionNode#
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
	 * @memberOf CPUFunctionNode#
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
		retArr.push('var ');
		for (let i = 0; i < vardecNode.declarations.length; i++) {
			this.declarations[vardecNode.declarations[i].id.name] = 'var';
			if (i > 0) {
				retArr.push(',');
			}
			this.astGeneric(vardecNode.declarations[i], retArr);
		}
		retArr.push(';');
		return retArr;
	}

	/**
	 * @memberOf CPUFunctionNode#
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
	 * @memberOf CPUFunctionNode#
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
	 * @memberOf CPUFunctionNode#
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
	 * @memberOf CPUFunctionNode#
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
	 * @memberOf CPUFunctionNode#
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
	 * @memberOf CPUFunctionNode#
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
	 * @memberOf CPUFunctionNode#
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
	 * @memberOf CPUFunctionNode#
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
		retArr.push('_this');
		return retArr;
	}

	/**
	 * @memberOf CPUFunctionNode#
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
		if (mNode.computed) {
			if (mNode.object.type === 'Identifier' ||
				(
					mNode.object.type === 'MemberExpression' &&
					mNode.object.object.object &&
					mNode.object.object.object.type === 'ThisExpression' &&
					mNode.object.object.property.name === 'constants'
				)) {
				this.pushState('identifier');
				this.astGeneric(mNode.object, retArr);
				this.popState('identifier');
				retArr.push('[');
				if (this.isInput(mNode.object.name)) {
					this.astGeneric(mNode.property, retArr);
				} else {
					this.astGeneric(mNode.property, retArr);
				}
				retArr.push(']');
			} else {
				if (mNode.object.object) {
					if (mNode.object.object.object && this.isInput(mNode.object.object.object.name)) {
						this.pushMemberState(mNode.object.object.object.name);
						this.pushState('input-index-z');
						this.astGeneric(mNode.object, retArr);
						const last = retArr.pop();
						retArr.push(' + ');
						this.popState('input-index-z');
						this.pushState('input-index');
						this.astGeneric(mNode.property, retArr);
						this.popState('input-index');
						retArr.push(last);
						this.popMemberState(mNode.object.object.object.name);
					} else if (this.isInput(mNode.object.object.name)) {
						this.pushMemberState(mNode.object.object.name);
						if (!this.isState('input-index-z')) {
							this.pushState('input-index-y');
						}
						this.astGeneric(mNode.object, retArr);
						const last = retArr.pop();
						retArr.push(' + ');
						if (!this.isState('input-index-z')) {
							this.popState('input-index-y');
						}

						const isInputIndexZ = this.isState('input-index-z');
						if (isInputIndexZ) {
							this.pushState('input-index-y');
						} else {
							this.pushState('input-index');
						}
						this.astGeneric(mNode.property, retArr);
						if (isInputIndexZ) {
							this.popState('input-index-y')
						} else {
							this.popState('input-index');
						}
						retArr.push(last);
						this.popMemberState(mNode.object.object.name);
					} else {
						this.astGeneric(mNode.object, retArr);
						const last = retArr.pop();
						retArr.push('][');
						this.astGeneric(mNode.property, retArr);
						retArr.push(last);
					}
				} else {
					this.astGeneric(mNode.object, retArr);
					const last = retArr.pop();
					retArr.push('][');
					this.astGeneric(mNode.property, retArr);
					retArr.push(last);
				}
			}
		} else {
			let unrolled = this.astMemberExpressionUnroll(mNode);
			if (mNode.property.type === 'Identifier' && mNode.computed) {
				unrolled = 'user_' + unrolled;
			}

			if (unrolled.indexOf('this.constants') === 0) {
				// remove 'this.constants' from beginning
				unrolled = 'constants_' + unrolled.substring(15);
			} else if (unrolled.indexOf('this') === 0) {
				// Its a reference to `this`, add '_' before
				unrolled = '_' + unrolled;
			}

			switch (this.state) {
				case 'input-index-y':
				case 'input-index-z':
					retArr.push('(');
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
					if (
						mNode.object &&
						mNode.object.name &&
						this.declarations[mNode.object.name]) {
						retArr.push('user_');
					}
					retArr.push(unrolled);
			}

			switch (this.state) {
				case 'input-index-y':
					{
						const size = this.paramSizes[this.paramNames.indexOf(this.memberState)];
						retArr.push(` * ${ size[0] })`);
						break;
					}
				case 'input-index-z':
					{
						const size = this.paramSizes[this.paramNames.indexOf(this.memberState)];
						retArr.push(` * ${ size[0] * size[1] })`);
						break;
					}
			}
		}
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
	 * @memberOf CPUFunctionNode#
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
	 * @memberOf CPUFunctionNode#
	 * @function
	 * @name astArrayExpression
	 *
	 * @desc Parses the abstract syntax tree for *Array* Expression
	 *
	 * @param {Object} arrNode - the AST object to parse
	 * @param {Array} retArr - return array string
	 *
	 * @returns {Array} the append retArr
	 */
	astArrayExpression(arrNode, retArr) {
		const arrLen = arrNode.elements.length;

		retArr.push('new Float32Array(');
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

	astDebuggerStatement(arrNode, retArr) {
		retArr.push('debugger;');
		return retArr;
	}
};