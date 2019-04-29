const {
	FunctionNode
} = require('../function-node');
// Closure capture for the ast function, prevent collision with existing AST functions
// The prefixes to use
const jsMathPrefix = 'Math.';
const localPrefix = 'this.';

/**
 * @desc [INTERNAL] Takes in a function node, and does all the AST voodoo required to toString its respective WebGL code
 * @extends FunctionNode
 * @returns the converted WebGL function string
 */
class WebGLFunctionNode extends FunctionNode {
	constructor(source, settings) {
		super(source, settings);
		this.fixIntegerDivisionAccuracy = null;
		if (settings && settings.hasOwnProperty('fixIntegerDivisionAccuracy')) {
			this.fixIntegerDivisionAccuracy = settings.fixIntegerDivisionAccuracy;
		}
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
			// looking up return type, this is a little expensive, and can be avoided if returnType is set
			if (!this.returnType) {
				const lastReturn = this.findLastReturn();
				if (lastReturn) {
					this.returnType = this.getType(ast.body);
					if (this.returnType === 'LiteralInteger') {
						this.returnType = 'Number';
					}
				}
			}

			const {
				returnType
			} = this;
			if (!returnType) {
				retArr.push('void');
			} else {
				const type = typeMap[returnType];
				if (!type) {
					throw new Error(`unknown type ${returnType}`);
				}
				retArr.push(type);
			}
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
				if (!argumentType || argumentType === 'LiteralInteger') {
					argumentType = 'Number';
				}
				const type = typeMap[argumentType];
				if (!type) {
					throw this.astErrorOutput('Unexpected expression', ast);
				}
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
		const type = this.getType(ast.argument);

		const result = [];

		if (!this.returnType) {
			if (this.isRootKernel) {
				this.returnType = 'Number';
			} else {
				this.returnType = type;
			}
		}

		switch (this.returnType) {
			case 'LiteralInteger':
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

						// Running astGeneric forces the LiteralInteger to pick a type, and here, if we are returning a float, yet
						// the LiteralInteger has picked to be an integer because of constraints on it we cast it to float.
						if (this.getType(ast) === 'Integer') {
							result.unshift('float(');
							result.push(')');
						}
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
			case 'Input':
				this.astGeneric(ast.argument, result);
				break;
			default:
				throw this.astErrorOutput(`unhandled return type ${this.returnType}`, ast);
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
				this.literalTypes[`${ast.start},${ast.end}`] = 'Integer';
				retArr.push(`${ast.value}`);
			} else if (this.isState('casting-to-float')) {
				this.literalTypes[`${ast.start},${ast.end}`] = 'Number';
				retArr.push(`${ast.value}.0`);
			} else {
				this.literalTypes[`${ast.start},${ast.end}`] = 'Number';
				retArr.push(`${ast.value}.0`);
			}
		} else if (this.isState('casting-to-integer')) {
			this.literalTypes[`${ast.start},${ast.end}`] = 'Integer';
			retArr.push(parseInt(ast.raw));
		} else {
			this.literalTypes[`${ast.start},${ast.end}`] = 'Number';
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

			const leftType = this.getType(ast.left);
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
			const rightType = this.getType(ast.right);

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
		if (this.fixIntegerDivisionAccuracy && ast.operator === '/') {
			retArr.push('div_with_int_check(');

			switch (this.getType(ast.left)) {
				case 'Integer':
					retArr.push('float(');
					this.pushState('casting-to-float');
					this.astGeneric(ast.left, retArr);
					this.popState('casting-to-float');
					retArr.push(')');
					break;
				case 'LiteralInteger':
					this.pushState('casting-to-float');
					this.astGeneric(ast.left, retArr);
					this.popState('casting-to-float');
					break;
				default:
					this.astGeneric(ast.left, retArr);
			}

			retArr.push(', ');

			switch (this.getType(ast.right)) {
				case 'Integer':
					retArr.push('float(');
					this.pushState('casting-to-float');
					this.astGeneric(ast.right, retArr);
					this.popState('casting-to-float');
					retArr.push(')');
					break;
				case 'LiteralInteger':
					this.pushState('casting-to-float');
					this.astGeneric(ast.right, retArr);
					this.popState('casting-to-float');
					break;
				default:
					this.astGeneric(ast.right, retArr);
			}

			retArr.push(')');
		} else {
			const leftType = this.getType(ast.left) || 'Number';
			const rightType = this.getType(ast.right) || 'Number';
			if (!leftType || !rightType) {
				throw this.astErrorOutput(`Unhandled binary expression`, ast);
			}
			const key = leftType + ' & ' + rightType;
			switch (key) {
				case 'Integer & Integer':
					this.astGeneric(ast.left, retArr);
					retArr.push(operatorMap[ast.operator] || ast.operator);
					this.astGeneric(ast.right, retArr);
					break;
				case 'Number & Float':
				case 'Float & Number':
				case 'Float & Float':
				case 'Number & Number':
					this.astGeneric(ast.left, retArr);
					retArr.push(operatorMap[ast.operator] || ast.operator);
					this.astGeneric(ast.right, retArr);
					break;
				case 'LiteralInteger & LiteralInteger':
					this.pushState('casting-to-float');
					this.astGeneric(ast.left, retArr);
					retArr.push(operatorMap[ast.operator] || ast.operator);
					this.astGeneric(ast.right, retArr);
					this.popState('casting-to-float');
					break;

				case 'Integer & Float':
				case 'Integer & Number':
					if (ast.operator === '>' || ast.operator === '<' && ast.right.type === 'Literal') {
						// if right value is actually a float, don't loose that information, cast left to right rather than the usual right to left
						if (!Number.isInteger(ast.right.value)) {
							this.pushState('casting-to-float');
							retArr.push('float(');
							this.astGeneric(ast.left, retArr);
							retArr.push(')');
							this.popState('casting-to-float');
							retArr.push(operatorMap[ast.operator] || ast.operator);
							this.astGeneric(ast.right, retArr);
							break;
						}
					}
					this.astGeneric(ast.left, retArr);
					retArr.push(operatorMap[ast.operator] || ast.operator);
					this.pushState('casting-to-integer');
					if (ast.right.type === 'Literal') {
						const literalResult = [];
						this.astGeneric(ast.right, literalResult);
						const literalType = this.getType(ast.right);
						if (literalType === 'Integer') {
							retArr.push(literalResult.join(''));
						} else {
							throw this.astErrorOutput(`Unhandled binary expression with literal`, ast);
						}
					} else {
						retArr.push('int(');
						this.astGeneric(ast.right, retArr);
						retArr.push(')');
					}
					this.popState('casting-to-integer');
					break;
				case 'Integer & LiteralInteger':
					this.astGeneric(ast.left, retArr);
					retArr.push(operatorMap[ast.operator] || ast.operator);
					this.pushState('casting-to-integer');
					this.astGeneric(ast.right, retArr);
					this.popState('casting-to-integer');
					break;

				case 'Number & Integer':
					this.astGeneric(ast.left, retArr);
					retArr.push(operatorMap[ast.operator] || ast.operator);
					this.pushState('casting-to-float');
					retArr.push('float(');
					this.astGeneric(ast.right, retArr);
					retArr.push(')');
					this.popState('casting-to-float');
					break;
				case 'Float & LiteralInteger':
				case 'Number & LiteralInteger':
					if (this.isState('in-for-loop-test')) {
						retArr.push('int(');
						this.astGeneric(ast.left, retArr);
						retArr.push(')');
						retArr.push(operatorMap[ast.operator] || ast.operator);
						this.pushState('casting-to-integer');
						this.astGeneric(ast.right, retArr);
						this.popState('casting-to-integer');
					} else {
						this.astGeneric(ast.left, retArr);
						retArr.push(operatorMap[ast.operator] || ast.operator);
						this.pushState('casting-to-float');
						this.astGeneric(ast.right, retArr);
						this.popState('casting-to-float');
					}
					break;
				case 'LiteralInteger & Float':
				case 'LiteralInteger & Number':
					if (this.isState('in-for-loop-test') || this.isState('in-for-loop-init') || this.isState('casting-to-integer')) {
						this.pushState('casting-to-integer');
						this.astGeneric(ast.left, retArr);
						retArr.push(operatorMap[ast.operator] || ast.operator);
						retArr.push('int(');
						this.astGeneric(ast.right, retArr);
						retArr.push(')');
						this.popState('casting-to-integer');
					} else {
						this.astGeneric(ast.left, retArr);
						retArr.push(operatorMap[ast.operator] || ast.operator);
						this.pushState('casting-to-float');
						this.astGeneric(ast.right, retArr);
						this.popState('casting-to-float');
					}
					break;
				case 'LiteralInteger & Integer':
					this.pushState('casting-to-integer');
					this.astGeneric(ast.left, retArr);
					this.popState('casting-to-integer');
					retArr.push(operatorMap[ast.operator] || ast.operator);
					this.astGeneric(ast.right, retArr);
					break;

				case 'Boolean & Boolean':
					this.astGeneric(ast.left, retArr);
					retArr.push(operatorMap[ast.operator] || ast.operator);
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
			throw this.astErrorOutput('IdentifierExpression - not an Identifier', idtNode);
		}

		const type = this.getType(idtNode);

		if (idtNode.name === 'Infinity') {
			// https://stackoverflow.com/a/47543127/1324039
			retArr.push('3.402823466e+38');
		} else if (type === 'Boolean') {
			if (this.argumentNames.indexOf(idtNode.name) > -1) {
				retArr.push(`bool(user_${idtNode.name})`);
			} else {
				retArr.push(`user_${idtNode.name}`);
			}
		} else {
			const userArgumentName = this.getKernelArgumentName(idtNode.name);
			if (userArgumentName) {
				retArr.push(`user_${userArgumentName}`);
			} else {
				retArr.push(`user_${idtNode.name}`);
			}
		}

		return retArr;
	}

	/**
	 * @desc Parses the abstract syntax tree for *for-loop* expression
	 * @param {Object} forNode - An ast Node
	 * @param {Array} retArr - return array string
	 * @returns {Array} the parsed webgl string
	 */
	astForStatement(forNode, retArr) {
		if (forNode.type !== 'ForStatement') {
			throw this.astErrorOutput('Invalid for statement', forNode);
		}

		const initArr = [];
		const testArr = [];
		const updateArr = [];
		const bodyArr = [];
		let isSafe = null;

		if (forNode.init) {
			this.pushState('in-for-loop-init');
			this.astGeneric(forNode.init, initArr);
			for (let i = 0; i < initArr.length; i++) {
				if (initArr[i].includes && initArr[i].includes(',')) {
					isSafe = false;
				}
			}
			this.popState('in-for-loop-init');
		} else {
			isSafe = false;
		}

		if (forNode.test) {
			this.pushState('in-for-loop-test');
			this.astGeneric(forNode.test, testArr);
			this.popState('in-for-loop-test');
		} else {
			isSafe = false;
		}

		if (forNode.update) {
			this.astGeneric(forNode.update, updateArr);
		} else {
			isSafe = false;
		}

		if (forNode.body) {
			this.pushState('loop-body');
			this.astGeneric(forNode.body, bodyArr);
			this.popState('loop-body');
		}

		// have all parts, now make them safe
		if (isSafe === null) {
			isSafe = this.isSafe(forNode.init) && this.isSafe(forNode.test);
		}

		if (isSafe) {
			retArr.push(`for (${initArr.join('')};${testArr.join('')};${updateArr.join('')}){\n`);
			retArr.push(bodyArr.join(''));
			retArr.push('}\n');
		} else {
			const iVariableName = this.getInternalVariableName('safeI');
			if (initArr.length > 0) {
				retArr.push(initArr.join(''), ';\n');
			}
			retArr.push(`for (int ${iVariableName}=0;${iVariableName}<LOOP_MAX;${iVariableName}++){\n`);
			if (testArr.length > 0) {
				retArr.push(`if (!${testArr.join('')}) break;\n`);
			}
			retArr.push(bodyArr.join(''));
			retArr.push(`\n${updateArr.join('')};`);
			retArr.push('}\n');
		}
		return retArr;
	}

	/**
	 * @desc Parses the abstract syntax tree for *while* loop
	 * @param {Object} whileNode - An ast Node
	 * @param {Array} retArr - return array string
	 * @returns {Array} the parsed webgl string
	 */
	astWhileStatement(whileNode, retArr) {
		if (whileNode.type !== 'WhileStatement') {
			throw this.astErrorOutput('Invalid while statement', whileNode);
		}

		const iVariableName = this.getInternalVariableName('safeI');
		retArr.push(`for (int ${iVariableName}=0;${iVariableName}<LOOP_MAX;${iVariableName}++){\n`);
		retArr.push('if (!');
		this.astGeneric(whileNode.test, retArr);
		retArr.push(') break;\n');
		this.astGeneric(whileNode.body, retArr);
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
			throw this.astErrorOutput('Invalid while statement', doWhileNode);
		}

		const iVariableName = this.getInternalVariableName('safeI');
		retArr.push(`for (int ${iVariableName}=0;${iVariableName}<LOOP_MAX;${iVariableName}++){\n`);
		this.astGeneric(doWhileNode.body, retArr);
		retArr.push('if (!');
		this.astGeneric(doWhileNode.test, retArr);
		retArr.push(') break;\n');
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
			const leftType = this.getType(assNode.left);
			const rightType = this.getType(assNode.right);
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
	 * @desc Parses the abstract syntax tree for *Block* statement
	 * @param {Object} bNode - the AST object to parse
	 * @param {Array} retArr - return array string
	 * @returns {Array} the append retArr
	 */
	astBlockStatement(bNode, retArr) {
		if (this.isState('loop-body')) {
			this.pushState('block-body'); // this prevents recursive removal of braces
			for (let i = 0; i < bNode.body.length; i++) {
				this.astGeneric(bNode.body[i], retArr);
			}
			this.popState('block-body');
		} else {
			retArr.push('{\n');
			for (let i = 0; i < bNode.body.length; i++) {
				this.astGeneric(bNode.body[i], retArr);
			}
			retArr.push('}\n');
		}
		return retArr;
	}

	/**
	 * @desc Parses the abstract syntax tree for *Variable Declaration*
	 * @param {Object} varDecNode - An ast Node
	 * @param {Array} retArr - return array string
	 * @returns {Array} the append retArr
	 */
	astVariableDeclaration(varDecNode, retArr) {
		if (varDecNode.kind === 'var') {
			this.varWarn();
		}
		const declarations = varDecNode.declarations;
		if (!declarations || !declarations[0] || !declarations[0].init) {
			throw this.astErrorOutput('Unexpected expression', varDecNode);
		}
		const result = [];
		const firstDeclaration = declarations[0];
		const init = firstDeclaration.init;
		const actualType = this.getType(init);
		const inForLoopInit = this.isState('in-for-loop-init');
		let type = inForLoopInit ? 'Integer' : actualType;
		if (type === 'LiteralInteger') {
			// We had the choice to go either float or int, choosing float
			type = 'Number';
		}
		const markupType = typeMap[type];
		if (!markupType) {
			throw this.astErrorOutput(`Markup type ${ markupType } not handled`, varDecNode);
		}
		let dependencies = this.getDependencies(firstDeclaration.init);
		const initResult = [];
		if (actualType === 'Integer' && type === 'Integer' && !inForLoopInit) {
			this.declarations[firstDeclaration.id.name] = Object.freeze({
				type: 'Number',
				dependencies,
				isSafe: this.isSafeDependencies(dependencies),
			});
			initResult.push('float ');
			initResult.push(`user_${firstDeclaration.id.name}=`);
			initResult.push('float(');
			this.astGeneric(init, initResult);
			initResult.push(')');
		} else {
			this.declarations[firstDeclaration.id.name] = Object.freeze({
				type,
				dependencies,
				isSafe: this.isSafeDependencies(dependencies),
			});
			initResult.push(`${markupType} `);
			initResult.push(`user_${firstDeclaration.id.name}=`);
			if (actualType === 'Number' && type === 'Integer') {
				initResult.push('int(');
				this.astGeneric(init, initResult);
				initResult.push(')');
			} else {
				this.astGeneric(init, initResult);
			}
		}
		result.push(initResult.join(''));

		// first declaration is done, now add multiple statements
		let lastType = type;
		for (let i = 1; i < declarations.length; i++) {
			const declaration = declarations[i];
			const nextResult = [];
			if (!inForLoopInit) {
				let possibleNewType = this.getType(declaration.init);
				if (possibleNewType === 'LiteralInteger') {
					possibleNewType = 'Number';
				}
				if (possibleNewType !== lastType) {
					nextResult.push(';');
					nextResult.push(typeMap[possibleNewType], ' ');
					lastType = possibleNewType;
				} else {
					nextResult.push(',');
				}
			} else {
				nextResult.push(',');
			}
			dependencies = this.getDependencies(declaration);
			this.declarations[declaration.id.name] = Object.freeze({
				type: lastType,
				dependencies: dependencies,
				isSafe: this.isSafeDependencies(dependencies),
			});
			this.astGeneric(declaration, nextResult);
			result.push(nextResult.join(''));
		}

		retArr.push(result.join(''));
		if (!inForLoopInit) {
			retArr.push(';');
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
		const {
			property,
			name,
			signature,
			origin,
			type,
			xProperty,
			yProperty,
			zProperty
		} = this.getMemberExpressionDetails(mNode);
		switch (signature) {
			case 'this.thread.value':
				if (name !== 'x' && name !== 'y' && name !== 'z') {
					throw this.astErrorOutput('Unexpected expression, expected `this.thread.x`, `this.thread.y`, or `this.thread.z`', mNode);
				}
				retArr.push(`threadId.${name}`);
				return retArr;
			case 'this.output.value':
				switch (name) {
					case 'x':
						if (this.isState('casting-to-integer')) {
							retArr.push(this.output[0]);
						} else {
							retArr.push(this.output[0], '.0');
						}
						break;
					case 'y':
						if (this.isState('casting-to-integer')) {
							retArr.push(this.output[1]);
						} else {
							retArr.push(this.output[1], '.0');
						}
						break;
					case 'z':
						if (this.isState('casting-to-integer')) {
							retArr.push(this.output[2]);
						} else {
							retArr.push(this.output[2], '.0');
						}
						break;
					default:
						throw this.astErrorOutput('Unexpected expression', mNode);
				}
				return retArr;
			case 'value':
				throw this.astErrorOutput('Unexpected expression', mNode);
			case 'value[]':
			case 'value[][]':
			case 'value[][][]':
			case 'value[][][][]':
			case 'value.value':
				if (origin === 'Math') {
					retArr.push(Math[name]);
					return retArr;
				}
				switch (property) {
					case 'r':
						retArr.push(`user_${ name }.r`);
						return retArr;
					case 'g':
						retArr.push(`user_${ name }.g`);
						return retArr;
					case 'b':
						retArr.push(`user_${ name }.b`);
						return retArr;
					case 'a':
						retArr.push(`user_${ name }.a`);
						return retArr;
				}
				break;
			case 'this.constants.value':
			case 'this.constants.value[]':
			case 'this.constants.value[][]':
			case 'this.constants.value[][][]':
			case 'this.constants.value[][][][]':
				break;
			case 'fn()[]':
				this.astCallExpression(mNode.object, retArr);
				retArr.push('[');
				retArr.push(this.memberExpressionPropertyMarkup(property));
				retArr.push(']');
				return retArr;
			case '[][]':
				this.astArrayExpression(mNode.object, retArr);
				retArr.push('[');
				retArr.push(this.memberExpressionPropertyMarkup(property));
				retArr.push(']');
				return retArr;
			default:
				throw this.astErrorOutput('Unexpected expression', mNode);
		}

		// handle simple types
		switch (type) {
			case 'Number':
			case 'Integer':
			case 'Float':
				retArr.push(`${ origin }_${ name}`);
				return retArr;
			case 'Boolean':
				retArr.push(`bool(${ origin }_${ name})`);
				return retArr;
		}

		// handle more complex types
		// argument may have come from a parent
		let synonymName = this.getKernelArgumentName(name);

		const markupName = `${origin}_${synonymName || name}`;

		switch (type) {
			case 'Array(2)':
			case 'Array(3)':
			case 'Array(4)':
				// Get from local vec4
				this.astGeneric(mNode.object, retArr);
				retArr.push('[');
				retArr.push(this.memberExpressionPropertyMarkup(xProperty));
				retArr.push(']');
				break;
			case 'HTMLImageArray':
				retArr.push(`getImage3D(${ markupName }, ${ markupName }Size, ${ markupName }Dim, `);
				this.memberExpressionXYZ(xProperty, yProperty, zProperty, retArr);
				retArr.push(')');
				break;
			case 'ArrayTexture(1)':
				retArr.push(`getFloatFromSampler2D(${ markupName }, ${ markupName }Size, ${ markupName }Dim, `);
				this.memberExpressionXYZ(xProperty, yProperty, zProperty, retArr);
				retArr.push(')');
				break;
			case 'ArrayTexture(2)':
				retArr.push(`getVec2FromSampler2D(${ markupName }, ${ markupName }Size, ${ markupName }Dim, `);
				this.memberExpressionXYZ(xProperty, yProperty, zProperty, retArr);
				retArr.push(')');
				break;
			case 'ArrayTexture(3)':
				retArr.push(`getVec3FromSampler2D(${ markupName }, ${ markupName }Size, ${ markupName }Dim, `);
				this.memberExpressionXYZ(xProperty, yProperty, zProperty, retArr);
				retArr.push(')');
				break;
			case 'ArrayTexture(4)':
			case 'HTMLImage':
				retArr.push(`getVec4FromSampler2D(${ markupName }, ${ markupName }Size, ${ markupName }Dim, `);
				this.memberExpressionXYZ(xProperty, yProperty, zProperty, retArr);
				retArr.push(')');
				break;
			case 'NumberTexture':
			case 'Array':
			case 'Array2D':
			case 'Array3D':
			case 'Array4D':
			case 'Input':

				if (this.precision === 'single') {
					// bitRatio is always 4 here, javascript doesn't yet have 8 or 16 bit support
					// TODO: make 8 or 16 bit work anyway!
					retArr.push(`getMemoryOptimized32(${markupName}, ${markupName}Size, ${markupName}Dim, `);
					this.memberExpressionXYZ(xProperty, yProperty, zProperty, retArr);
					retArr.push(')');
				} else {
					const bitRatio = (origin === 'user' ?
						this.lookupFunctionArgumentBitRatio(this.name, name) :
						this.constantBitRatios[name]
					);
					switch (bitRatio) {
						case 1:
							retArr.push(`get8(${markupName}, ${markupName}Size, ${markupName}Dim, `);
							break;
						case 2:
							retArr.push(`get16(${markupName}, ${markupName}Size, ${markupName}Dim, `);
							break;
						case 4:
						case 0:
							retArr.push(`get32(${markupName}, ${markupName}Size, ${markupName}Dim, `);
							break;
						default:
							throw new Error(`unhandled bit ratio of ${ bitRatio}`);
					}
					this.memberExpressionXYZ(xProperty, yProperty, zProperty, retArr);
					retArr.push(')');
				}
				break;
			case 'MemoryOptimizedNumberTexture':
				retArr.push(`getMemoryOptimized32(${ markupName }, ${ markupName }Size, ${ markupName }Dim, `);
				this.memberExpressionXYZ(xProperty, yProperty, zProperty, retArr);
				retArr.push(')');
				break;
			default:
				throw new Error(`unhandled member expression "${ type }"`);
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
		if (!ast.callee) {
			// Failure, unknown expression
			throw this.astErrorOutput(
				'Unknown CallExpression',
				ast
			);
		}

		// Get the full function call, unrolled
		let functionName = this.astMemberExpressionUnroll(ast.callee);
		const isMathFunction = functionName.indexOf(jsMathPrefix) === 0;

		// Its a math operator, remove the prefix
		if (isMathFunction) {
			functionName = functionName.slice(jsMathPrefix.length);
		}

		// Its a local function, remove this
		if (functionName.indexOf(localPrefix) === 0) {
			functionName = functionName.slice(localPrefix.length);
		}

		// if this if grows to more than one, lets use a switch
		if (functionName === 'atan2') {
			functionName = 'atan';
		}

		// Register the function into the called registry
		if (this.calledFunctions.indexOf(functionName) < 0) {
			this.calledFunctions.push(functionName);
		}

		if (functionName === 'random' && this.plugins && this.plugins.length > 0) {
			for (let i = 0; i < this.plugins.length; i++) {
				const plugin = this.plugins[i];
				if (plugin.functionMatch === 'Math.random()' && plugin.functionReplace) {
					retArr.push(plugin.functionReplace);
					return retArr;
				}
			}
		}

		// track the function was called
		if (this.onFunctionCall) {
			this.onFunctionCall(this.name, functionName);
		}

		// Call the function
		retArr.push(functionName);

		// Open arguments space
		retArr.push('(');

		// Add the arguments
		if (isMathFunction) {
			for (let i = 0; i < ast.arguments.length; ++i) {
				const argument = ast.arguments[i];
				const argumentType = this.getType(argument);
				if (i > 0) {
					retArr.push(', ');
				}

				switch (argumentType) {
					case 'Integer':
						this.pushState('casting-to-float');
						retArr.push('float(');
						this.astGeneric(argument, retArr);
						retArr.push(')');
						this.popState('casting-to-float');
						break;
					default:
						this.astGeneric(argument, retArr);
						break;
				}
			}
		} else {
			const targetTypes = this.lookupFunctionArgumentTypes(functionName) || [];
			for (let i = 0; i < ast.arguments.length; ++i) {
				const argument = ast.arguments[i];
				let targetType = targetTypes[i];
				if (i > 0) {
					retArr.push(', ');
				}
				const argumentType = this.getType(argument);
				if (!targetType) {
					this.triggerImplyArgumentType(functionName, i, argumentType, this);
					targetType = argumentType;
				}
				switch (argumentType) {
					case 'Number':
					case 'Float':
						if (targetType === 'Integer') {
							retArr.push('int(');
							this.astGeneric(argument, retArr);
							retArr.push(')');
							continue;
						} else if (targetType === 'Number' || targetType === 'Float') {
							this.astGeneric(argument, retArr);
							continue;
						} else if (targetType === 'LiteralInteger') {
							this.pushState('casting-to-float');
							this.astGeneric(argument, retArr);
							this.popState('casting-to-float');
							continue;
						}
						break;
					case 'Integer':
						if (targetType === 'Number' || targetType === 'Float') {
							retArr.push('float(');
							this.astGeneric(argument, retArr);
							retArr.push(')');
							continue;
						} else if (targetType === 'Integer') {
							this.astGeneric(argument, retArr);
							continue;
						}
						break;
					case 'LiteralInteger':
						if (targetType === 'Integer') {
							this.pushState('casting-to-integer');
							this.astGeneric(argument, retArr);
							this.popState('casting-to-integer');
							continue;
						} else if (targetType === 'Number' || targetType === 'Float') {
							this.pushState('casting-to-float');
							this.astGeneric(argument, retArr);
							this.popState('casting-to-float');
							continue;
						} else if (targetType === 'LiteralInteger') {
							this.astGeneric(argument, retArr);
							continue;
						}
						break;
					case 'Array(2)':
					case 'Array(3)':
					case 'Array(4)':
						if (targetType === argumentType) {
							this.astGeneric(argument, retArr);
							continue;
						}
						break;
					case 'Array':
					case 'Input':
						if (targetType === argumentType) {
							this.triggerTrackArgumentSynonym(this.name, argument.name, functionName, i);
							this.astGeneric(argument, retArr);
							continue;
						}
						break;
				}
				throw new Error(`Unhandled argument combination of ${ argumentType } and ${ targetType }`);
			}
		}
		// Close arguments space
		retArr.push(')');

		return retArr;
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

	memberExpressionXYZ(x, y, z, retArr) {
		if (z) {
			retArr.push(this.memberExpressionPropertyMarkup(z), ', ');
		} else {
			retArr.push('0, ');
		}
		if (y) {
			retArr.push(this.memberExpressionPropertyMarkup(y), ', ');
		} else {
			retArr.push('0, ');
		}
		retArr.push(this.memberExpressionPropertyMarkup(x));
		return retArr;
	}

	memberExpressionPropertyMarkup(property) {
		if (!property) {
			throw new Error('Property not set');
		}
		const type = this.getType(property);
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
	'Boolean': 'bool',
	'Float': 'float',
	'Input': 'sampler2D',
	'Integer': 'int',
	'Number': 'float',
	'LiteralInteger': 'float',
	'NumberTexture': 'sampler2D',
	'MemoryOptimizedNumberTexture': 'sampler2D',
	'ArrayTexture(1)': 'sampler2D',
	'ArrayTexture(2)': 'sampler2D',
	'ArrayTexture(3)': 'sampler2D',
	'ArrayTexture(4)': 'sampler2D',
};

const operatorMap = {
	'===': '==',
	'!==': '!='
};

module.exports = {
	WebGLFunctionNode
};