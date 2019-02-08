const {
	FunctionNode
} = require('../function-node');
// Closure capture for the ast function, prevent collision with existing AST functions
// The prefixes to use
const jsMathPrefix = 'Math.';
const localPrefix = 'this.';

/**
 * @desc [INTERNAL] Takes in a function node, and does all the AST voodoo required to toString its respective WebGL code
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
			const {
				returnType
			} = this;
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

			if (this.getType(ast.left) !== 'Number') {
				retArr.push('int(');
				this.pushState('casting-to-float');
				this.astGeneric(ast.left, retArr);
				this.popState('casting-to-float');
				retArr.push(')');
			} else {
				this.astGeneric(ast.left, retArr);
			}

			retArr.push(', ');

			if (this.getType(ast.right) !== 'Number') {
				retArr.push('float(');
				this.pushState('casting-to-float');
				this.astGeneric(ast.right, retArr);
				this.popState('casting-to-float');
				retArr.push(')');
			} else {
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

				case 'Integer & Number':
					this.astGeneric(ast.left, retArr);
					retArr.push(operatorMap[ast.operator] || ast.operator);
					this.pushState('casting-to-integer');
					retArr.push('int(');
					this.astGeneric(ast.right, retArr);
					retArr.push(')');
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
				case 'Number & LiteralInteger':
					this.astGeneric(ast.left, retArr);
					retArr.push(operatorMap[ast.operator] || ast.operator);
					this.pushState('casting-to-float');
					this.astGeneric(ast.right, retArr);
					this.popState('casting-to-float');
					break;

				case 'LiteralInteger & Number':
					this.pushState('casting-to-float');
					this.astGeneric(ast.left, retArr);
					this.popState('casting-to-float');
					retArr.push(operatorMap[ast.operator] || ast.operator);
					this.astGeneric(ast.right, retArr);
					break;
				case 'LiteralInteger & Integer':
					this.pushState('casting-to-integer');
					this.astGeneric(ast.left, retArr);
					this.popState('casting-to-integer');
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
			if (userArgumentName) {
				retArr.push(`user_${userArgumentName}`);
			} else {
				retArr.push(`user_${idtNode.name}`);
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
				this.isIdentifierConstant(forNode.test.right.name) === false) {

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
				const leftType = this.getType(forNode.test.left);
				const rightType = this.getType(forNode.test.right);
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
				'Invalid while statement',
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
				'Invalid while statement',
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
		retArr.push('{\n');
		for (let i = 0; i < bNode.body.length; i++) {
			this.astGeneric(bNode.body[i], retArr);
		}
		retArr.push('}\n');
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
		let declarationType = this.isState('in-for-loop-init') ? 'Integer' : this.getType(init);
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
				retArr.push(`threadId.${ name }`);
				return retArr;
			case 'this.output.value':
				switch (name) {
					case 'x':
						retArr.push(this.output[0]);
						break;
					case 'y':
						retArr.push(this.output[1]);
						break;
					case 'z':
						retArr.push(this.output[2]);
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
				break;
			case 'fn()[]':
				this.astCallExpression(mNode.object, retArr);
				retArr.push('[');
				retArr.push(this.memberExpressionPropertyMarkup(property));
				retArr.push(']');
				return retArr;
			default:
				throw this.astErrorOutput('Unexpected expression', mNode);
		}

		if (type === 'Number' || type === 'Integer') {
			retArr.push(`${ origin }_${ name}`);
			return retArr;
		}

		// argument may have come from a parent
		let synonymName;
		if (this.parent) {
			synonymName = this.getUserArgumentName(name);
		}

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
			case 'ArrayTexture(4)':
			case 'HTMLImage':
				retArr.push(`getImage2D(${ markupName }, ${ markupName }Size, ${ markupName }Dim, `);
				this.memberExpressionXYZ(xProperty, yProperty, zProperty, retArr);
				retArr.push(')');
				break;
			default:
				retArr.push(`get(${ markupName }, ${ markupName }Size, ${ markupName }Dim, ${ markupName }BitRatio, `);
				this.memberExpressionXYZ(xProperty, yProperty, zProperty, retArr);
				retArr.push(')');
				break;
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
			if (!this.calledFunctionsArguments[funcName]) {
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
				const argumentType = this.getType(argument);
				if (argumentType) {
					functionArguments.push({
						name: argument.name || null,
						type: argumentType
					});
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
	'Float': 'float',
	'Input': 'sampler2D',
	'Integer': 'int',
	'Number': 'float',
	'NumberTexture': 'sampler2D',
	'ArrayTexture(4)': 'sampler2D'
};

const operatorMap = {
	'===': '==',
	'!==': '!='
};

module.exports = {
	WebGLFunctionNode
};