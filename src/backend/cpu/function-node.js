const {
	FunctionNode
} = require('../function-node');

/**
 * @desc [INTERNAL] Represents a single function, inside JS
 *
 * <p>This handles all the raw state, converted state, etc. Of a single function.</p>
 */
class CPUFunctionNode extends FunctionNode {
	/**
	 * @desc Parses the abstract syntax tree for to its *named function*
	 * @param {Object} ast - the AST object to parse
	 * @param {Array} retArr - return array string
	 * @returns {Array} the append retArr
	 */
	astFunctionExpression(ast, retArr) {

		// Setup function return type and name
		if (!this.isRootKernel) {
			retArr.push('function');
			retArr.push(' ');
			retArr.push(this.name);
			retArr.push('(');

			// Arguments handling
			for (let i = 0; i < this.argumentNames.length; ++i) {
				const argumentName = this.argumentNames[i];

				if (i > 0) {
					retArr.push(', ');
				}
				retArr.push('user_');
				retArr.push(argumentName);
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
	 * @desc Parses the abstract syntax tree for to *return* statement
	 * @param {Object} ast - the AST object to parse
	 * @param {Array} retArr - return array string
	 * @returns {Array} the append retArr
	 */
	astReturnStatement(ast, retArr) {
		if (this.isRootKernel) {
			retArr.push('kernelResult = ');
			this.astGeneric(ast.argument, retArr);
			retArr.push(';');
		} else if (this.isSubKernel) {
			retArr.push(`subKernelResult_${ this.name } = `);
			this.astGeneric(ast.argument, retArr);
			retArr.push(';');
			retArr.push(`return subKernelResult_${ this.name };`);
		} else {
			retArr.push('return ');
			this.astGeneric(ast.argument, retArr);
			retArr.push(';');
		}
		return retArr;
	}

	/**
	 * @desc Parses the abstract syntax tree for *literal value*
	 * @param {Object} ast - the AST object to parse
	 * @param {Array} retArr - return array string
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
	 * @desc Parses the abstract syntax tree for *binary* expression
	 * @param {Object} ast - the AST object to parse
	 * @param {Array} retArr - return array string
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

		switch (idtNode.name) {
			case 'Infinity':
				retArr.push('Infinity');
				break;
			default:
				if (this.constants && this.constants.hasOwnProperty(idtNode.name)) {
					retArr.push('constants_' + idtNode.name);
				} else {
					const name = this.getUserArgumentName(idtNode.name);
					const type = this.getType(idtNode);
					if (name && type && this.parent && type !== 'Number' && type !== 'Integer' && type !== 'LiteralInteger') {
						retArr.push('user_' + name);
					} else {
						retArr.push('user_' + idtNode.name);
					}
				}
		}

		return retArr;
	}

	/**
	 * @desc Parses the abstract syntax tree for *for-loop* expression
	 * @param {Object} forNode - An ast Node
	 * @param {Array} retArr - return array string
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
			if ((forNode.test.right.type === 'Identifier') &&
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
				const declarations = forNode.init.declarations;
				if (!Array.isArray(declarations) || declarations.length < 1) {
					throw new Error('Error: Incompatible for loop declaration');
				}

				if (declarations.length > 1) {
					retArr.push('for (');
					retArr.push(`${forNode.init.kind} `);
					for (let i = 0; i < declarations.length; i++) {
						if (i > 0) {
							retArr.push(',');
						}
						this.astGeneric(declarations[i], retArr);
					}
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
	 * @desc Parses the abstract syntax tree for *while* loop
	 * @param {Object} whileNode - An ast Node
	 * @param {Array} retArr - return array string
	 * @returns {Array} the parsed javascript string
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
	 * @desc Parses the abstract syntax tree for *Assignment* Expression
	 * @param {Object} assNode - An ast Node
	 * @param {Array} retArr - return array string
	 * @returns {Array} the append retArr
	 */
	astAssignmentExpression(assNode, retArr) {
		this.astGeneric(assNode.left, retArr);
		retArr.push(assNode.operator);
		this.astGeneric(assNode.right, retArr);
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
	 * @desc Parses the abstract syntax tree for *Variable Declaration*
	 * @param {Object} varDecNode - An ast Node
	 * @param {Array} retArr - return array string
	 * @returns {Array} the append retArr
	 */
	astVariableDeclaration(varDecNode, retArr) {
		if (varDecNode.kind === 'var') {
			this.varWarn();
		}
		retArr.push(`${varDecNode.kind} `);
		const firstDeclaration = varDecNode.declarations[0];
		const type = this.getType(firstDeclaration.init);
		for (let i = 0; i < varDecNode.declarations.length; i++) {
			this.declarations[varDecNode.declarations[i].id.name] = type;
			if (i > 0) {
				retArr.push(',');
			}
			this.astGeneric(varDecNode.declarations[i], retArr);
		}
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
		retArr.push('_this');
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
			signature,
			type,
			property,
			xProperty,
			yProperty,
			zProperty,
			name,
			origin
		} = this.getMemberExpressionDetails(mNode);
		switch (signature) {
			case 'this.thread.value':
				retArr.push(`_this.thread.${ name }`);
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
						retArr.push(`user_${ name }[0]`);
						return retArr;
					case 'g':
						retArr.push(`user_${ name }[1]`);
						return retArr;
					case 'b':
						retArr.push(`user_${ name }[2]`);
						return retArr;
					case 'a':
						retArr.push(`user_${ name }[3]`);
						return retArr;
				}
				break;
			case 'this.constants.value':
			case 'this.constants.value[]':
			case 'this.constants.value[][]':
			case 'this.constants.value[][][]':
				break;
			case 'fn()[]':
				this.astGeneric(mNode.object, retArr);
				retArr.push('[');
				this.astGeneric(mNode.property, retArr);
				retArr.push(']');
				return retArr;
			default:
				throw this.astErrorOutput('Unexpected expression', mNode);
		}

		if (type === 'Number' || type === 'Integer') {
			retArr.push(`${origin}_${name}`);
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
			case 'HTMLImageArray':
			case 'ArrayTexture(4)':
			case 'HTMLImage':
			default:
				const isInput = this.isInput(synonymName || name);
				retArr.push(`${ markupName }`);
				if (zProperty && yProperty) {
					if (isInput) {
						const size = this.argumentSizes[this.argumentNames.indexOf(name)];
						retArr.push('[(');
						this.astGeneric(zProperty, retArr);
						retArr.push(`*${ size[1] * size[0]})+(`);
						this.astGeneric(yProperty, retArr);
						retArr.push(`*${ size[0] })+`);
						this.astGeneric(xProperty, retArr);
						retArr.push(']');
					} else {
						retArr.push('[');
						this.astGeneric(zProperty, retArr);
						retArr.push(']');
						retArr.push('[');
						this.astGeneric(yProperty, retArr);
						retArr.push(']');
						retArr.push('[');
						this.astGeneric(xProperty, retArr);
						retArr.push(']');
					}
				} else if (yProperty) {
					if (isInput) {
						const size = this.argumentSizes[this.argumentNames.indexOf(name)];
						retArr.push('[(');
						this.astGeneric(yProperty, retArr);
						retArr.push(`*${ size[0] })+`);
						this.astGeneric(xProperty, retArr);
						retArr.push(']');
					} else {
						retArr.push('[');
						this.astGeneric(yProperty, retArr);
						retArr.push(']');
						retArr.push('[');
						this.astGeneric(xProperty, retArr);
						retArr.push(']');
					}
				} else {
					retArr.push('[');
					this.astGeneric(xProperty, retArr);
					retArr.push(']');
				}
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

			// Register the function into the called registry
			if (this.calledFunctions.indexOf(funcName) < 0) {
				this.calledFunctions.push(funcName);
			}
			if (!this.calledFunctionsArguments[funcName]) {
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

		retArr.push('[');
		for (let i = 0; i < arrLen; ++i) {
			if (i > 0) {
				retArr.push(', ');
			}
			const subNode = arrNode.elements[i];
			this.astGeneric(subNode, retArr)
		}
		retArr.push(']');

		return retArr;
	}

	astDebuggerStatement(arrNode, retArr) {
		retArr.push('debugger;');
		return retArr;
	}

	varWarn() {
		console.warn('var declarations are not supported, weird things happen.  Use const or let');
	}
}

module.exports = {
	CPUFunctionNode
};