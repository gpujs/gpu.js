const {
	FunctionNode
} = require('../function-node');
// Closure capture for the ast function, prevent collision with existing AST functions
// The prefixes to use
const jsMathPrefix = 'Math.';
const localPrefix = 'this.';
const constantsPrefix = 'this.constants.';

/**
 * @desc [INTERNAL] Takes in a function node, and does all the AST voodoo required to toString its respective webGL code
 * @returns the converted webGL function string
 */
class WebGLFunctionNode extends FunctionNode {
	constructor(source, settings) {
		super(source, settings);
		this.fixIntegerDivisionAccuracy = null;
		if (settings && settings.hasOwnProperty('fixIntegerDivisionAccuracy')) {
			this.fixIntegerDivisionAccuracy = settings.fixIntegerDivisionAccuracy;
		}
		this._string = null;
	}

	toString() {
		if (this._string) return this._string;
		return this._string = this.astGeneric(this.getJsAST(), []).join('').trim();
	}

	/**
	 * @desc Parses the abstract syntax tree for to its *named function prototype*
	 * @param {Object} ast - the AST object to parse
	 * @param {Array} retArr - return array string
	 * @returns {Array} the append retArr
	 */
	astFunctionPrototype(ast, retArr) {
		// Setup function return type and name
		if (this.isRootKernel || this.isSubKernel) {
			return retArr;
		}

		const returnType = this.returnType;
		const type = typeMap[returnType];
		if (!type) {
			throw new Error(`unknown type ${ returnType }`);
		}
		retArr.push(type);
		retArr.push(' ');
		retArr.push(this.name);
		retArr.push('(');

		// Arguments handling
		for (let i = 0; i < this.argumentNames.length; ++i) {
			if (i > 0) {
				retArr.push(', ');
			}

			retArr.push(this.argumentTypes[i]);
			retArr.push(' ');
			retArr.push('user_');
			retArr.push(this.argumentNames[i]);
		}

		retArr.push(');\n');

		return retArr;
	}

	/**
	 * @desc Parses the abstract syntax tree for to its *named function*
	 * @param {Object} ast - the AST object to parse
	 * @param {Array} retArr - return array string
	 * @returns {Array} the append retArr
	 */
	astFunctionExpression(ast, retArr) {

		// Setup function return type and name
		if (this.isRootKernel) {
			retArr.push('void');
		} else {
			const returnType = this.returnType;
			const type = typeMap[returnType];
			if (!type) {
				throw new Error(`unknown type ${ returnType }`);
			}
			retArr.push(type);
		}
		retArr.push(' ');
		retArr.push(this.name);
		retArr.push('(');

		if (!this.isRootKernel) {
			// Arguments handling
			for (let i = 0; i < this.argumentNames.length; ++i) {
				const argumentName = this.argumentNames[i];

				if (i > 0) {
					retArr.push(', ');
				}
				let argumentType = this.getVariableType(argumentName);
				if (!argumentType) {
					argumentType = 'Number';
				}
				const type = typeMap[argumentType];
				retArr.push(type);
				retArr.push(' ');
				retArr.push('user_');
				retArr.push(argumentName);
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
	 * @desc Parses the abstract syntax tree for to *return* statement
	 * @param {Object} ast - the AST object to parse
	 * @param {Array} retArr - return array string
	 * @returns {Array} the append retArr
	 */
	astReturnStatement(ast, retArr) {
		if (!ast.argument) throw this.astErrorOutput('Unexpected return statement', ast);
		const type = this.firstAvailableTypeFromAst(ast.argument);

		const result = [];

		switch (this.returnType) {
			case 'Number':
			case 'Float':
				switch (type) {
					case 'Integer':
						result.push('float(');
						this.astGeneric(ast.argument, result);
						result.push(')');
						break;
					case 'LiteralInteger':
						this.pushState('casting-to-float');
						this.astGeneric(ast.argument, result);
						this.popState('casting-to-float');
						break;
					default:
						this.astGeneric(ast.argument, result);
				}
				break;
			case 'Integer':
				switch (type) {
					case 'Number':
						this.pushState('casting-to-integer');
						result.push('int(');
						this.astGeneric(ast.argument, result);
						result.push(')');
						this.popState('casting-to-integer');
						break;
					case 'LiteralInteger':
						this.pushState('casting-to-integer');
						this.astGeneric(ast.argument, result);
						this.popState('casting-to-integer');
						break;
					default:
						this.astGeneric(ast.argument, result);
				}
				break;
			case 'Array(4)':
			case 'Array(3)':
			case 'Array(2)':
				this.astGeneric(ast.argument, result);
				break;
			default:
				throw this.astErrorOutput('Unknown return handler', ast);
		}

		if (this.isRootKernel) {
			retArr.push(`kernelResult = ${ result.join('') };`);
			retArr.push('return;');
		} else if (this.isSubKernel) {
			retArr.push(`subKernelResult_${ this.name } = ${ result.join('') };`);
			retArr.push(`return subKernelResult_${ this.name };`);
		} else {
			retArr.push(`return ${ result.join('') };`);
		}
		return retArr;
	}

	/**
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

		if (Number.isInteger(ast.value)) {
			if (this.isState('in-for-loop-init') || this.isState('casting-to-integer')) {
				retArr.push(`${ast.value}`);
			} else if (this.isState('casting-to-float')) {
				retArr.push(`${ast.value}.0`);
			} else {
				retArr.push(`${ast.value}.0`);
			}
		} else if (this.isState('casting-to-integer')) {
			retArr.push(parseInt(ast.raw));
		} else {
			retArr.push(`${ast.value}`);
		}
		return retArr;
	}

	/**
	 * @desc Parses the abstract syntax tree for *binary* expression
	 * @param {Object} ast - the AST object to parse
	 * @param {Array} retArr - return array string
	 * @returns {Array} the append retArr
	 */
	astBinaryExpression(ast, retArr) {
		if (ast.operator === '%') {
			retArr.push('mod(');

			const leftType = this.firstAvailableTypeFromAst(ast.left);
			if (leftType === 'Integer') {
				retArr.push('float(');
				this.astGeneric(ast.left, retArr);
				retArr.push(')');
			} else if (leftType === 'LiteralInteger') {
				this.pushState('casting-to-float');
				this.astGeneric(ast.left, retArr);
				this.popState('casting-to-float');
			} else {
				this.astGeneric(ast.left, retArr);
			}

			retArr.push(',');
			const rightType = this.firstAvailableTypeFromAst(ast.right);

			if (rightType === 'Integer') {
				retArr.push('float(');
				this.astGeneric(ast.right, retArr);
				retArr.push(')');
			} else if (rightType === 'LiteralInteger') {
				this.pushState('casting-to-float');
				this.astGeneric(ast.right, retArr);
				this.popState('casting-to-float');
			} else {
				this.astGeneric(ast.right, retArr);
			}
			retArr.push(')');
			return retArr;
		}

		retArr.push('(');
		if (ast.operator === '===') {
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
			const leftType = this.firstAvailableTypeFromAst(ast.left) || 'Number';
			const rightType = this.firstAvailableTypeFromAst(ast.right) || 'Number';
			if (!leftType || !rightType) {
				throw this.astErrorOutput(`Unhandled binary expression`, ast);
			}
			const key = leftType + ' & ' + rightType;
			switch (key) {
				case 'Integer & Integer':
					this.astGeneric(ast.left, retArr);
					retArr.push(ast.operator);
					this.astGeneric(ast.right, retArr);
					break;
				case 'Number & Number':
					this.astGeneric(ast.left, retArr);
					retArr.push(ast.operator);
					this.astGeneric(ast.right, retArr);
					break;
				case 'LiteralInteger & LiteralInteger':
					this.pushState('casting-to-float');
					this.astGeneric(ast.left, retArr);
					retArr.push(ast.operator);
					this.astGeneric(ast.right, retArr);
					this.popState('casting-to-float');
					break;

				case 'Integer & Number':
					this.astGeneric(ast.left, retArr);
					retArr.push(ast.operator);
					this.pushState('casting-to-integer');
					retArr.push('int(');
					this.astGeneric(ast.right, retArr);
					retArr.push(')');
					this.popState('casting-to-integer');
					break;
				case 'Integer & LiteralInteger':
					this.astGeneric(ast.left, retArr);
					retArr.push(ast.operator);
					this.pushState('casting-to-integer');
					this.astGeneric(ast.right, retArr);
					this.popState('casting-to-integer');
					break;

				case 'Number & Integer':
					this.astGeneric(ast.left, retArr);
					retArr.push(ast.operator);
					this.pushState('casting-to-float');
					retArr.push('float(');
					this.astGeneric(ast.right, retArr);
					retArr.push(')');
					this.popState('casting-to-float');
					break;
				case 'Number & LiteralInteger':
					this.astGeneric(ast.left, retArr);
					retArr.push(ast.operator);
					this.pushState('casting-to-float');
					this.astGeneric(ast.right, retArr);
					this.popState('casting-to-float');
					break;

				case 'LiteralInteger & Number':
					this.pushState('casting-to-float');
					this.astGeneric(ast.left, retArr);
					this.popState('casting-to-float');
					retArr.push(ast.operator);
					this.astGeneric(ast.right, retArr);
					break;
				case 'LiteralInteger & Integer':
					this.pushState('casting-to-integer');
					this.astGeneric(ast.left, retArr);
					this.popState('casting-to-integer');
					retArr.push(ast.operator);
					this.astGeneric(ast.right, retArr);
					break;
				default:
					throw this.astErrorOutput(`Unhandled binary expression between ${key}`, ast);
			}
		}

		retArr.push(')');
		return retArr;
	}

	/**
	 * @desc Parses the abstract syntax tree for *identifier* expression
	 * @param {Object} idtNode - An ast Node
	 * @param {Array} retArr - return array string
	 * @returns {Array} the append retArr
	 */
	astIdentifierExpression(idtNode, retArr) {
		if (idtNode.type !== 'Identifier') {
			throw this.astErrorOutput(
				'IdentifierExpression - not an Identifier',
				idtNode
			);
		}

		if (idtNode.name === 'Infinity') {
			// https://stackoverflow.com/a/47543127/1324039
			retArr.push('3.402823466e+38');
		} else {
			const userArgumentName = this.getUserArgumentName(idtNode.name);
			if (userArgumentName !== null) {
				this.pushParameter(retArr, userArgumentName);
			} else {
				this.pushParameter(retArr, idtNode.name);
			}
		}

		return retArr;
	}

	/**
	 * @desc Parses the abstract syntax tree forfor *for-loop* expression
	 * @param {Object} forNode - An ast Node
	 * @param {Array} retArr - return array string
	 * @returns {Array} the parsed webgl string
	 */
	astForStatement(forNode, retArr) {
		if (forNode.type !== 'ForStatement') {
			throw this.astErrorOutput(
				'Invalid for statement',
				forNode
			);
		}

		if (forNode.test && forNode.test.type === 'BinaryExpression') {
			if (forNode.test.right.type === 'Identifier' &&
				forNode.test.operator === '<' &&
				this.isIdentifierConstant(this.astGetFirstAvailableName(forNode.test.right)) === false) {

				if (!this.loopMaxIterations) {
					console.warn('Warning: loopMaxIterations is not set! Using default of 1000 which may result in unintended behavior.');
					console.warn('Set loopMaxIterations or use a for loop of fixed length to silence this message.');
				}

				retArr.push('for (');
				this.pushState('in-for-loop-init');
				this.astGeneric(forNode.init, retArr);
				this.popState('in-for-loop-init');
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
				const leftType = this.firstAvailableTypeFromAst(forNode.test.left);
				const rightType = this.firstAvailableTypeFromAst(forNode.test.right);
				if (!leftType) throw this.astErrorOutput('Left type unknown', forNode.test.left);
				if (!rightType) throw this.astErrorOutput('Right type unknown', forNode.test.right);
				if (leftType === 'Integer' && rightType === 'Number') {
					this.pushState('casting-to-integer');
					retArr.push('int(');
					this.astGeneric(forNode.test.right, retArr);
					retArr.push(')');
					this.popState('casting-to-integer');
				} else if (leftType === 'Number' && rightType === 'Integer') {
					this.pushState('casting-to-float');
					retArr.push('float(');
					this.astGeneric(forNode.test.right, retArr);
					retArr.push(')');
					this.popState('casting-to-float');
				} else {
					this.astGeneric(forNode.test.right, retArr);
				}
				retArr.push(') {\n');
				if (forNode.body.type === 'BlockStatement') {
					for (let i = 0; i < forNode.body.body.length; i++) {
						this.astGeneric(forNode.body.body[i], retArr);
					}
				} else {
					this.astGeneric(forNode.body, retArr);
				}
				retArr.push('\n} else {\n');
				retArr.push('break;\n');
				retArr.push('}\n');
				retArr.push('}\n');

				return retArr;
			} else if (forNode.init.declarations) {
				const declarations = forNode.init.declarations;
				if (!Array.isArray(declarations) || declarations.length < 1) {
					throw this.astErrorOutput('Error: Incompatible for loop declaration', forNode.init);
				}

				if (declarations.length > 1) {
					retArr.push('for (');
					this.pushState('in-for-loop-init');
					retArr.push('int ');
					for (let i = 0; i < declarations.length; i++) {
						const declaration = declarations[i];
						if (i > 0) {
							retArr.push(',');
						}
						this.declarations[declaration.id.name] = 'Integer';
						this.astGeneric(declaration, retArr);
					}
					retArr.push(';');
					this.popState('in-for-loop-init');
				} else {
					retArr.push('for (');
					this.pushState('in-for-loop-init');
					this.astGeneric(forNode.init, retArr);
					this.popState('in-for-loop-init');
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
	 * @desc Parses the abstract syntax tree for *while* loop
	 * @param {Object} whileNode - An ast Node
	 * @param {Array} retArr - return array string
	 * @returns {Array} the parsed webgl string
	 */
	astWhileStatement(whileNode, retArr) {
		if (whileNode.type !== 'WhileStatement') {
			throw this.astErrorOutput(
				'Invalid while statment',
				whileNode
			);
		}

		retArr.push('for (int i = 0; i < LOOP_MAX; i++) {');
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
	 * @desc Parses the abstract syntax tree for *do while* loop
	 * @param {Object} doWhileNode - An ast Node
	 * @param {Array} retArr - return array string
	 * @returns {Array} the parsed webgl string
	 */
	astDoWhileStatement(doWhileNode, retArr) {
		if (doWhileNode.type !== 'DoWhileStatement') {
			throw this.astErrorOutput(
				'Invalid while statment',
				doWhileNode
			);
		}

		retArr.push('for (int i = 0; i < LOOP_MAX; i++) {');
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
	 * @desc Parses the abstract syntax tree for *Assignment* Expression
	 * @param {Object} assNode - An ast Node
	 * @param {Array} retArr - return array string
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
			const leftType = this.firstAvailableTypeFromAst(assNode.left);
			const rightType = this.firstAvailableTypeFromAst(assNode.right);
			this.astGeneric(assNode.left, retArr);
			retArr.push(assNode.operator);
			if (leftType !== 'Integer' && rightType === 'Integer') {
				retArr.push('float(');
				this.astGeneric(assNode.right, retArr);
				retArr.push(')');
			} else {
				this.astGeneric(assNode.right, retArr);
			}
			return retArr;
		}
	}

	/**
	 * @desc Parses the abstract syntax tree for an *Empty* Statement
	 * @param {Object} eNode - An ast Node
	 * @param {Array} retArr - return array string
	 * @returns {Array} the append retArr
	 */
	astEmptyStatement(eNode, retArr) {
		//retArr.push(';\n');
		return retArr;
	}

	/**
	 * @desc Parses the abstract syntax tree for *Block* statement
	 * @param {Object} bNode - the AST object to parse
	 * @param {Array} retArr - return array string
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
	 * @desc Parses the abstract syntax tree for *generic expression* statement
	 * @param {Object} esNode - An ast Node
	 * @param {Array} retArr - return array string
	 * @returns {Array} the append retArr
	 */
	astExpressionStatement(esNode, retArr) {
		this.astGeneric(esNode.expression, retArr);
		retArr.push(';');
		return retArr;
	}

	/**
	 * @desc Parses the abstract syntax tree for *Variable Declaration*
	 * @param {Object} varDecNode - An ast Node
	 * @param {Array} retArr - return array string
	 * @returns {Array} the append retArr
	 */
	astVariableDeclaration(varDecNode, retArr) {
		const declarations = varDecNode.declarations;
		if (!declarations || !declarations[0] || !declarations[0].init) throw this.astErrorOutput('Unexpected expression', varDecNode);
		const result = [];
		const firstDeclaration = declarations[0];
		const init = firstDeclaration.init;
		let declarationType = this.isState('in-for-loop-init') ? 'Integer' : this.firstAvailableTypeFromAst(init);
		if (declarationType === 'LiteralInteger') {
			// We had the choice to go either float or int, choosing float
			declarationType = 'Number';
		}
		const type = typeMap[declarationType];
		if (!type) {
			throw this.astErrorOutput(`type ${ declarationType } not handled`, varDecNode);
		}
		this.declarations[firstDeclaration.id.name] = declarationType;
		const initResult = [`${type} user_${firstDeclaration.id.name}=`];
		this.astGeneric(init, initResult);
		result.push(initResult.join(''));

		// first declaration is done, now any added ones setup
		for (let i = 1; i < declarations.length; i++) {
			const declaration = declarations[i];
			this.declarations[declaration.id.name] = declarationType;
			this.astGeneric(declaration, result);
		}

		retArr.push(retArr, result.join(','));
		retArr.push(';');
		return retArr;
	}

	/**
	 * @desc Parses the abstract syntax tree for *Variable Declarator*
	 * @param {Object} iVarDecNode - An ast Node
	 * @param {Array} retArr - return array string
	 * @returns {Array} the append retArr
	 */
	astVariableDeclarator(iVarDecNode, retArr) {
		this.astGeneric(iVarDecNode.id, retArr);
		if (iVarDecNode.init !== null) {
			retArr.push('=');
			this.astGeneric(iVarDecNode.init, retArr);
		}
		return retArr;
	}

	/**
	 * @desc Parses the abstract syntax tree for *If* Statement
	 * @param {Object} ifNode - An ast Node
	 * @param {Array} retArr - return array string
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
	 * @desc Parses the abstract syntax tree for *Break* Statement
	 * @param {Object} brNode - An ast Node
	 * @param {Array} retArr - return array string
	 * @returns {Array} the append retArr
	 */
	astBreakStatement(brNode, retArr) {
		retArr.push('break;\n');
		return retArr;
	}

	/**
	 * @desc Parses the abstract syntax tree for *Continue* Statement
	 * @param {Object} crNode - An ast Node
	 * @param {Array} retArr - return array string
	 * @returns {Array} the append retArr
	 */
	astContinueStatement(crNode, retArr) {
		retArr.push('continue;\n');
		return retArr;
	}

	/**
	 * @desc Parses the abstract syntax tree for *Logical* Expression
	 * @param {Object} logNode - An ast Node
	 * @param {Array} retArr - return array string
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
	 * @desc Parses the abstract syntax tree for *Update* Expression
	 * @param {Object} uNode - An ast Node
	 * @param {Array} retArr - return array string
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
	 * @desc Parses the abstract syntax tree for *Unary* Expression
	 * @param {Object} uNode - An ast Node
	 * @param {Array} retArr - return array string
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
	 * @desc Parses the abstract syntax tree for *This* expression
	 * @param {Object} tNode - An ast Node
	 * @param {Array} retArr - return array string
	 * @returns {Array} the append retArr
	 */
	astThisExpression(tNode, retArr) {
		retArr.push('this');
		return retArr;
	}

	/**
	 * @desc Parses the abstract syntax tree for *Member* Expression
	 * @param {Object} mNode - An ast Node
	 * @param {Array} retArr - return array string
	 * @returns {Array} the append retArr
	 */
	astMemberExpression(mNode, retArr) {
		const variableSignature = this.getVariableSignature(mNode);
		let xProperty = null;
		let yProperty = null;
		let zProperty = null;
		let name = null;
		let type = null;
		switch (variableSignature) {
			case 'this.thread.value':
				retArr.push(`threadId.${ mNode.property.name }`);
				return retArr;
			case 'this.output.value':
				switch (mNode.property.name) {
					case 'x':
						retArr.push(this.output[0]);
						break;
					case 'y':
						retArr.push(this.output[1]);
						break;
					case 'z':
						retArr.push(this.output[2]);
						break;
				}
				return retArr;
			case 'value':
				{
					throw this.astErrorOutput('Unexpected expression', mNode);
				}
			case 'value[]':
				{
					if (typeof mNode.object.name !== 'string') throw this.astErrorOutput('Unexpected expression', mNode);
					name = 'user_' + mNode.object.name;
					type = this.getVariableType(mNode.object.name);
					xProperty = mNode.property;
					break;
				}
			case 'value[][]':
				{
					if (typeof mNode.object.object.name !== 'string') throw this.astErrorOutput('Unexpected expression', mNode);
					name = 'user_' + mNode.object.object.name;
					type = this.getVariableType(mNode.object.object.name);
					yProperty = mNode.object.property;
					xProperty = mNode.property;
					break;
				}
			case 'value[][][]':
				{
					if (typeof mNode.object.object.object.name !== 'string') throw this.astErrorOutput('Unexpected expression', mNode);
					name = 'user_' + mNode.object.object.object.name;
					type = this.getVariableType(mNode.object.object.object.name);
					zProperty = mNode.object.object.property;
					yProperty = mNode.object.property;
					xProperty = mNode.property;
					break;
				}
			case 'value.value':
				{
					if (typeof mNode.property.name !== 'string') throw this.astErrorOutput('Unexpected expression', mNode);
					if (this.isAstMathVariable(mNode)) {
						retArr.push(Math[mNode.property.name]);
						return retArr;
					}
					switch (mNode.property.name) {
						case 'r':
							retArr.push(`user_${ mNode.object.name }.r`);
							return retArr;
						case 'g':
							retArr.push(`user_${ mNode.object.name }.g`);
							return retArr;
						case 'b':
							retArr.push(`user_${ mNode.object.name }.b`);
							return retArr;
						case 'a':
							retArr.push(`user_${ mNode.object.name }.a`);
							return retArr;
					}
					break;
				}
			case 'this.constants.value':
				{
					if (typeof mNode.property.name !== 'string') throw this.astErrorOutput('Unexpected expression', mNode);
					name = 'constants_' + mNode.property.name;
					type = this.getConstantType(mNode.property.name);
					if (!type) {
						throw this.astErrorOutput('Constant has no type', mNode);
					}
					break;
				}
			case 'this.constants.value[]':
				{
					if (typeof mNode.object.property.name !== 'string') throw this.astErrorOutput('Unexpected expression', mNode);
					name = 'constants_' + mNode.object.property.name;
					type = this.getConstantType(mNode.object.property.name);
					if (!type) {
						throw this.astErrorOutput('Constant has no type', mNode);
					}
					xProperty = mNode.property;
					break;
				}
			case 'this.constants.value[][]':
				{
					if (typeof mNode.object.object.property.name !== 'string') throw this.astErrorOutput('Unexpected expression', mNode);
					name = 'constants_' + mNode.object.object.property.name;
					type = this.getConstantType(mNode.object.object.property.name);
					if (!type) {
						throw this.astErrorOutput('Constant has no type', mNode);
					}
					yProperty = mNode.object.property;
					xProperty = mNode.property;
					break;
				}
			case 'this.constants.value[][][]':
				{
					if (typeof mNode.object.object.object.property.name !== 'string') throw this.astErrorOutput('Unexpected expression', mNode);
					name = 'constants_' + mNode.object.object.object.property.name;
					type = this.getConstantType(mNode.object.object.object.property.name);
					if (!type) {
						throw this.astErrorOutput('Constant has no type', mNode);
					}
					zProperty = mNode.object.object.property;
					yProperty = mNode.object.property;
					xProperty = mNode.property;
					break;
				}
			default:
				throw this.astErrorOutput('Unexpected expression', mNode);
		}
		switch (type) {
			case 'Number':
				retArr.push(name);
				break;
			case 'Integer':
				retArr.push(name);
				break;
			case 'Array(2)':
			case 'Array(3)':
			case 'Array(4)':
				// Get from local vec4
				this.astGeneric(mNode.object, retArr);
				retArr.push('[');
				retArr.push(mNode.property.raw);
				retArr.push(']');
				break;
			case 'HTMLImageArray':
				// Get from image
				retArr.push(`getImage3D(${ name }, ${ name }Size, ${ name }Dim, `);
				if (zProperty) {
					retArr.push(this.getMemberExpressionPropertyMarkup(zProperty), ', ');
				} else {
					retArr.push('0, ');
				}
				if (yProperty) {
					retArr.push(this.getMemberExpressionPropertyMarkup(yProperty), ', ');
				} else {
					retArr.push('0, ');
				}
				retArr.push(this.getMemberExpressionPropertyMarkup(xProperty));
				retArr.push(')');
				break;
			case 'ArrayTexture(4)':
			case 'HTMLImage':
				retArr.push(`getImage2D(${ name }, ${ name }Size, ${ name }Dim, `);
				this.pushState('casting-to-integer');
				if (zProperty) {
					retArr.push(this.getMemberExpressionPropertyMarkup(zProperty), ', ');
				} else {
					retArr.push('0, ');
				}
				if (yProperty) {
					retArr.push(this.getMemberExpressionPropertyMarkup(yProperty), ', ');
				} else {
					retArr.push('0, ');
				}
				retArr.push(this.getMemberExpressionPropertyMarkup(xProperty));
				this.popState('casting-to-integer');
				retArr.push(')');
				break;
			default:
				retArr.push(`get(${ name }, ${ name }Size, ${ name }Dim, ${ name }BitRatio, `);
				if (zProperty) {
					retArr.push(this.getMemberExpressionPropertyMarkup(zProperty), ', ');
				} else {
					retArr.push('0, ');
				}
				if (yProperty) {
					retArr.push(this.getMemberExpressionPropertyMarkup(yProperty), ', ');
				} else {
					retArr.push('0, ');
				}
				retArr.push(this.getMemberExpressionPropertyMarkup(xProperty));
				retArr.push(')');
				break;
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
	 * @desc Parses the abstract syntax tree for *call* expression
	 * @param {Object} ast - the AST object to parse
	 * @param {Array} retArr - return array string
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

			if (funcName === 'random' && this.plugins) {
				for (let i = 0; i < this.plugins.length; i++) {
					const plugin = this.plugins[i];
					if (plugin.functionMatch === 'Math.random()' && plugin.functionReplace) {
						functionArguments.push(plugin.functionReturnType);
						retArr.push(plugin.functionReplace);
					}
				}
				return retArr;
			}

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
					const argumentIndex = this.argumentNames.indexOf(argument.name);
					if (argumentIndex === -1) {
						functionArguments.push(null);
					} else {
						functionArguments.push({
							name: argument.name,
							type: this.argumentTypes[argumentIndex] || 'Number'
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
	}

	/**
	 * @desc Parses the abstract syntax tree for *Array* Expression
	 * @param {Object} arrNode - the AST object to parse
	 * @param {Array} retArr - return array string
	 * @returns {Array} the append retArr
	 */
	astArrayExpression(arrNode, retArr) {
		const arrLen = arrNode.elements.length;

		retArr.push('vec' + arrLen + '(');
		for (let i = 0; i < arrLen; ++i) {
			if (i > 0) {
				retArr.push(', ');
			}
			const subNode = arrNode.elements[i];
			this.astGeneric(subNode, retArr)
		}
		retArr.push(')');

		return retArr;
	}

	/**
	 * @function
	 * @name pushParameter
	 *
	 * @desc [INTERNAL] pushes a source parameter onto retArr and 'casts' to int if necessary
	 *  i.e. deal with force-int-parameter state
	 *
	 * @param {Array} retArr - return array string
	 * @param {String} name - the parameter name
	 *
	 */
	pushParameter(retArr, name) {
		retArr.push(`user_${name}`);
	}


	/**
	 *
	 * @param ast
	 * @returns {string|null}
	 */
	astGetFirstAvailableName(ast) {
		if (ast.name) {
			return ast.name;
		}
		return null;
	}

	firstAvailableTypeFromAst(ast) {
		switch (ast.type) {
			case 'ArrayExpression':
				return `Array(${ ast.elements.length })`;
			case 'Literal':
				if (Number.isInteger(ast.value)) {
					return 'LiteralInteger';
				} else {
					return 'Number';
				}
			case 'Identifier':
				if (this.isAstVariable(ast)) {
					if (this.getVariableSignature(ast) === 'value') {
						return this.getVariableType(ast.name)
					}
				}
				// TODO: remove after testing?
				throw this.astErrorOutput('Unhandled Identifier', ast);
			case 'MemberExpression':
				if (this.isAstMathFunction(ast)) {
					switch (ast.property.name) {
						case 'ceil':
							return 'Integer';
						case 'floor':
							return 'Integer';
						case 'round':
							return 'Integer';
					}
					return 'Number';
				}
				if (this.isAstVariable(ast)) {
					const variableSignature = this.getVariableSignature(ast);
					switch (variableSignature) {
						case 'value[]':
							return typeLookupMap[this.getVariableType(ast.object.name)];
						case 'value[][]':
							return typeLookupMap[this.getVariableType(ast.object.object.name)];
						case 'value[][][]':
							return typeLookupMap[this.getVariableType(ast.object.object.object.name)];
						case 'value.value':
							if (this.isAstMathVariable(ast)) {
								return 'Number';
							}
							switch (ast.property.name) {
								case 'r':
									return typeLookupMap[this.getVariableType(ast.object.name)];
								case 'g':
									return typeLookupMap[this.getVariableType(ast.object.name)];
								case 'b':
									return typeLookupMap[this.getVariableType(ast.object.name)];
								case 'a':
									return typeLookupMap[this.getVariableType(ast.object.name)];
								default:
									throw this.astErrorOutput('Unhandled MemberExpression', ast);
							}
							break;
						case 'this.thread.value':
							return 'Integer';
						case 'this.output.value':
							return 'Integer';
						case 'this.constants.value':
							return this.getConstantType(ast.property.name);
						case 'this.constants.value[]':
							return typeLookupMap[this.getConstantType(ast.object.property.name)];
						case 'this.constants.value[][]':
							return typeLookupMap[this.getConstantType(ast.object.object.property.name)];
						case 'this.constants.value[][][]':
							return typeLookupMap[this.getConstantType(ast.object.object.object.property.name)];
					}
					// TODO: remove after testing?
					throw this.astErrorOutput('Unhandled MemberExpression', ast);
				}
				// TODO: remove after testing?
				throw this.astErrorOutput('Unhandled MemberExpression', ast);
			case 'CallExpression':
				if (this.isAstMathFunction(ast)) {
					return 'Number';
				}
				return ast.callee && ast.callee.name && this.lookupReturnType ? this.lookupReturnType(ast.callee.name) : null;
			case 'BinaryExpression':
				// modulos is float and there isn't a "%" operator in glsl
				if (ast.operator === '%') {
					return 'Number';
				}
				return this.firstAvailableTypeFromAst(ast.left);
			case 'UpdateExpression':
				return this.firstAvailableTypeFromAst(ast.argument);
			default:
				throw this.astErrorOutput(`Unhandled Type "${ ast.type }"`, ast);
		}

		return null;
	}

	build() {
		return this.toString().length > 0;
	}

	// TODO: move to super
	isAstMathVariable(ast) {
		const mathProperties = [
			'E',
			'PI',
			'SQRT2',
			'SQRT1_2',
			'LN2',
			'LN10',
			'LOG2E',
			'LOG10E',
		];
		return ast.type === 'MemberExpression' &&
			ast.object && ast.object.type === 'Identifier' &&
			ast.object.name === 'Math' &&
			ast.property &&
			ast.property.type === 'Identifier' &&
			mathProperties.indexOf(ast.property.name) > -1;
	}

	// TODO: move to super
	isAstMathFunction(ast) {
		const mathFunctions = [
			'abs',
			'acos',
			'asin',
			'atan',
			'atan2',
			'ceil',
			'cos',
			'exp',
			'floor',
			'log',
			'log2',
			'max',
			'min',
			'pow',
			'random',
			'round',
			'sign',
			'sin',
			'sqrt',
			'tan',
		];
		return ast.type === 'CallExpression' &&
			ast.callee &&
			ast.callee.type === 'MemberExpression' &&
			ast.callee.object &&
			ast.callee.object.type === 'Identifier' &&
			ast.callee.object.name === 'Math' &&
			ast.callee.property &&
			ast.callee.property.type === 'Identifier' &&
			mathFunctions.indexOf(ast.callee.property.name) > -1;
	}

	isAstVariable(ast) {
		return ast.type === 'Identifier' || ast.type === 'MemberExpression';
	}

	getVariableSignature(ast) {
		if (!this.isAstVariable(ast)) {
			throw new Error(`ast of type "${ ast.type }" is not a variable signature`);
		}
		if (ast.type === 'Identifier') {
			return 'value';
		}
		const signature = [];
		while (true) {
			if (!ast) break;
			if (ast.computed) {
				signature.push('[]');
			} else if (ast.type === 'ThisExpression') {
				signature.unshift('this');
			} else if (ast.property && ast.property.name) {
				if (
					ast.property.name === 'x' ||
					ast.property.name === 'y' ||
					ast.property.name === 'z'
				) {
					signature.unshift('.value');
				} else if (
					ast.property.name === 'constants' ||
					ast.property.name === 'thread' ||
					ast.property.name === 'output'
				) {
					signature.unshift('.' + ast.property.name);
				} else {
					signature.unshift('.value');
				}
			} else if (ast.name) {
				signature.unshift('value');
			} else {
				signature.unshift('unknown');
			}
			ast = ast.object;
		}

		const signatureString = signature.join('');
		const allowedExpressions = [
			'value',
			'value[]',
			'value[][]',
			'value[][][]',
			'value.value',
			'this.thread.value',
			'this.output.value',
			'this.constants.value',
			'this.constants.value[]',
			'this.constants.value[][]',
			'this.constants.value[][][]',
		];
		if (allowedExpressions.indexOf(signatureString) > -1) {
			return signatureString;
		}
		return null;
	}

	getMemberExpressionPropertyMarkup(property) {
		if (!property) {
			throw new Error('Property not set');
		}
		const type = this.firstAvailableTypeFromAst(property);
		const result = [];
		if (type === 'Number') {
			this.pushState('casting-to-integer');
			result.push('int(');
			this.astGeneric(property, result);
			result.push(')');
			this.popState('casting-to-integer');
		} else if (type === 'LiteralInteger') {
			this.pushState('casting-to-integer');
			this.astGeneric(property, result);
			this.popState('casting-to-integer');
		} else {
			this.astGeneric(property, result);
		}
		return result.join('');
	}
}

const typeMap = {
	'Array': 'sampler2D',
	'Array(2)': 'vec2',
	'Array(3)': 'vec3',
	'Array(4)': 'vec4',
	'Array2D': 'sampler2D',
	'Array3D': 'sampler2D',
	'Float': 'float',
	'Input': 'sampler2D',
	'Integer': 'int',
	'Number': 'float',
	'NumberTexture': 'sampler2D',
	'ArrayTexture(4)': 'sampler2D'
};

const typeLookupMap = {
	'Array': 'Number',
	'Array(2)': 'Number',
	'Array(3)': 'Number',
	'Array(4)': 'Number',
	'Array2D': 'Number',
	'Array3D': 'Number',
	'HTMLImage': 'Array(4)',
	'HTMLImageArray': 'Array(4)',
	'NumberTexture': 'Number',
	'ArrayTexture(4)': 'Array(4)',
};

module.exports = {
	WebGLFunctionNode
};