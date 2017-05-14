const FunctionNodeBase = require('../function-node-base');
// Closure capture for the ast function, prevent collision with existing AST functions
/// Function: functionNodeWebGl
///
/// [INTERNAL] Takes in a function node, and does all the AST voodoo required to generate its respective webGL code.
///
/// Parameter:
/// 	inNode - {functionNode} The function node object
///
/// Returns:
/// 	the converted webGL function string
///

// The prefixes to use
const jsMathPrefix = 'Math.';
const localPrefix = 'this.';
const constantsPrefix = 'this.constants.';

function isIdentifierKernelParam(paramName, ast, funcParam) {
	return funcParam.paramNames.indexOf(paramName) !== -1;
}

function ensureIndentifierType(paramName, expectedType, ast, funcParam) {
	const start = ast.loc.start;

	if (!isIdentifierKernelParam(paramName, funcParam) && expectedType !== 'float') {
		throw 'Error unexpected identifier ' + paramName + ' on line ' + start.line;
	} else {
		const actualType = funcParam.paramType[funcParam.paramNames.indexOf(paramName)];
		if (actualType !== expectedType) {
			throw 'Error unexpected identifier ' + paramName + ' on line ' + start.line;
		}
	}
}

const DECODE32_ENCODE32 = /decode32\(\s+encode32\(/g;
const ENCODE32_DECODE32 = /encode32\(\s+decode32\(/g;

///
/// Function: webgl_regex_optimize
///
/// [INTERNAL] Takes the near final webgl function string, and do regex search and replacments.
/// For voodoo optimize out the following
///
/// - decode32(encode32(
/// - encode32(decode32(
///
function webGlRegexOptimize(inStr) {
	return inStr
		.replace(DECODE32_ENCODE32, '((')
		.replace(ENCODE32_DECODE32, '((');
}


/// the AST error, with its location. To throw
///
/// @TODO: add location support fpr the AST error
///
/// @param error        the error message output
/// @param ast          the AST object where the error is
/// @param funcParam    FunctionNode, that tracks compilation state
function astErrorOutput(error, ast, funcParam) {
	console.error(error, ast, funcParam);
	return error;
}

module.exports = class WebGLFunctionNode extends FunctionNodeBase {
	constructor(functionName, jsFunction, paramTypeArray, returnType) {
		super(functionName, jsFunction, paramTypeArray, returnType);
		this.opt = null;
	}

	generate(_opt) {
		const opt = this.opt = _opt || {};
		if (opt.debug) {
			console.log(this);
		}
		if (opt.prototypeOnly) {
			return WebGLFunctionNode.astFunctionPrototype(this.getJsAST(), [], this).join('').trim();
		} else {
			this.functionStringArray = this.astGeneric(this.getJsAST(), [], this);
		}
		this.functionString = webGlRegexOptimize(
			this.functionStringArray.join('').trim()
		);
		return this.functionString;
	}

	isIdentifierConstant(paramName) {
		if (!this.opt.constants) return false;
		return this.opt.constants.indexOf(paramName) !== -1;
	}

	/// Parses the abstract syntax tree, generically to its respective function
	///
	/// @param ast          the AST object to parse
	/// @param retArr       return array string
	/// @param funcParam    FunctionNode, that tracks compilation state
	///
	/// @returns  the prased openclgl string array
	astGeneric(ast, retArr, funcParam) {
		if (ast === null) {
			throw astErrorOutput('NULL ast', ast, funcParam);
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
			}

			throw astErrorOutput('Unknown ast type : ' + ast.type, ast, funcParam);
		}
	}

	/// Parses the abstract syntax tree, to its named function declaration
	///
	/// @param ast   the AST object to parse
	/// @param retArr       return array string
	/// @param funcParam    FunctionNode, that tracks compilation state
	///
	/// @returns  the append retArr
	astFunctionDeclaration(ast, retArr, funcParam) {
		// TODO: make this less hacky?
		const lines = this.jsFunctionString.split(/\r?\n/);

		const start = ast.loc.start;
		const end = ast.loc.end;

		const funcArr = [];

		funcArr.push(lines[start.line - 1].slice(start.column));
		for (let i = start.line; i < end.line - 1; i++) {
			funcArr.push(lines[i]);
		}
		funcArr.push(lines[end.line - 1].slice(0, end.column));

		const funcStr = funcArr.join('\n');
		if (this.addFunction) {
			this.addFunction(null, new Function(`return ${ funcStr };`)());
		}

		return retArr;
	}

	/// Parses the abstract syntax tree, to its named function prototype
	///
	/// @param ast   the AST object to parse
	/// @param retArr       return array string
	/// @param funcParam    FunctionNode, that tracks compilation state
	///
	/// @returns  the append retArr
	static astFunctionPrototype(ast, retArr, funcParam) {
		// Setup function return type and name
		if (funcParam.isRootKernel) {
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

			retArr.push(funcParam.paramType[i]);
			retArr.push(' ');
			retArr.push('user_');
			retArr.push(funcParam.paramNames[i]);
		}

		retArr.push(');\n');

		return retArr;
	}

	/// Parses the abstract syntax tree, to its named function
	///
	/// @param ast   the AST object to parse
	/// @param retArr       return array string
	/// @param funcParam    FunctionNode, that tracks compilation state
	///
	/// @returns  the append retArr
	astFunctionExpression(ast, retArr, funcParam) {

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
			for (let i = 0; i < funcParam.paramNames.length; ++i) {
				if (i > 0) {
					retArr.push(', ');
				}

				retArr.push(funcParam.paramType[i]);
				retArr.push(' ');
				retArr.push('user_');
				retArr.push(funcParam.paramNames[i]);
			}
		}

		// Function opening
		retArr.push(') {\n');

		// Body statement iteration
		for (let i = 0; i < ast.body.length; ++i) {
			this.astGeneric(ast.body[i], retArr, funcParam);
			retArr.push('\n');
		}

		// Function closing
		retArr.push('}\n');
		return retArr;
	}

	/// Parses the abstract syntax tree, to return function
	///
	/// @param ast          the AST object to parse
	/// @param retArr       return array string
	/// @param funcParam    FunctionNode, that tracks compilation state
	///
	/// @returns  the append retArr
	astReturnStatement(ast, retArr, funcParam) {
		if (funcParam.isRootKernel) {
			retArr.push('kernelResult = ');
			this.astGeneric(ast.argument, retArr, funcParam);
			retArr.push(';');
			retArr.push('return;');
		} else {
			retArr.push('return ');
			this.astGeneric(ast.argument, retArr, funcParam);
			retArr.push(';');
		}

		//throw astErrorOutput(
		//	'Non main function return, is not supported : '+funcParam.currentFunctionNamespace,
		//	ast, funcParam
		//);

		return retArr;
	}

	/// Parses the abstract syntax tree, literal value
	///
	/// @param ast          the AST object to parse
	/// @param retArr       return array string
	/// @param funcParam    FunctionNode, that tracks compilation state
	///
	/// @returns  the append retArr
	astLiteral(ast, retArr, funcParam) {

		// Reject non numeric literals
		if (isNaN(ast.value)) {
			throw astErrorOutput(
				'Non-numeric literal not supported : ' + ast.value,
				ast, funcParam
			);
		}

		// Push the literal value as a float/int
		retArr.push(ast.value);

		// If it was an int, node made a float
		if (Number.isInteger(ast.value)) {
			retArr.push('.0');
		}

		return retArr;
	}

	/// Parses the abstract syntax tree, binary expression
	///
	/// @param ast          the AST object to parse
	/// @param retArr       return array string
	/// @param funcParam    FunctionNode, that tracks compilation state
	///
	/// @returns  the append retArr
	astBinaryExpression(ast, retArr, funcParam) {
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

	/// Parses the abstract syntax tree, identifier expression
	///
	/// @param ast          the AST object to parse
	/// @param retArr       return array string
	/// @param funcParam    FunctionNode, that tracks compilation state
	///
	/// @returns  the append retArr
	astIdentifierExpression(idtNode, retArr, funcParam) {
		if (idtNode.type !== 'Identifier') {
			throw astErrorOutput(
				'IdentifierExpression - not an Identifier',
				ast, funcParam
			);
		}

		if (idtNode.name === 'gpu_threadX') {
			retArr.push('threadId.x');
		} else if (idtNode.name === 'gpu_threadY') {
			retArr.push('threadId.y');
		} else if (idtNode.name === 'gpu_threadZ') {
			retArr.push('threadId.z');
		} else if (idtNode.name === 'gpu_dimensionsX') {
			retArr.push('uOutputDim.x');
		} else if (idtNode.name === 'gpu_dimensionsY') {
			retArr.push('uOutputDim.y');
		} else if (idtNode.name === 'gpu_dimensionsZ') {
			retArr.push('uOutputDim.z');
		} else {
			retArr.push('user_' + idtNode.name);
		}

		return retArr;
	}

	/// Parses the abstract syntax tree, genericially to its respective function
	///
	/// @param ast   the AST object to parse
	///
	/// @returns  the prased openclgl string
	astForStatement(forNode, retArr, funcParam) {
		if (forNode.type !== 'ForStatement') {
			throw astErrorOutput(
				'Invalid for statment',
				ast, funcParam
			);
		}

		if (forNode.test && forNode.test.type === 'BinaryExpression') {
			if (forNode.test.right.type === 'Identifier' &&
				forNode.test.operator === '<' &&
				this.isIdentifierConstant(forNode.test.right.name) === false) {

				if (this.opt.loopMaxIterations === undefined) {
					console.warn('Warning: loopMaxIterations is not set! Using default of 100 which may result in unintended behavior.');
					console.warn('Set loopMaxIterations or use a for loop of fixed length to silence this message.');
				}

				retArr.push('for (float ');
				this.astGeneric(forNode.init, retArr, funcParam);
				retArr.push(';');
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
			} else {
				retArr.push('for (float ');

				if (!Array.isArray(forNode.init) || forNode.init.length < 1) {
					console.log(this.jsFunctionString);
					console.warn('Warning: Incompatible for loop declaration');
				}

				this.astGeneric(forNode.init, retArr, funcParam);
				retArr.push(';');
				this.astGeneric(forNode.test, retArr, funcParam);
				retArr.push(';');
				this.astGeneric(forNode.update, retArr, funcParam);
				retArr.push(')');
				this.astGeneric(forNode.body, retArr, funcParam);
				return retArr;
			}
		}

		throw astErrorOutput(
			'Invalid for statement',
			ast, funcParam
		);
	}

	/// Parses the abstract syntax tree, generically to its respective function
	///
	/// @param ast   the AST object to parse
	///
	/// @returns  the parsed openclgl string
	astWhileStatement(whileNode, retArr, funcParam) {
		if (whileNode.type !== 'WhileStatement') {
			throw astErrorOutput(
				'Invalid while statment',
				ast, funcParam
			);
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

	astAssignmentExpression(assNode, retArr, funcParam) {
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

	astEmptyStatement(eNode, retArr, funcParam) {
		//retArr.push(';\n');
		return retArr;
	}

	astBlockStatement(bNode, retArr, funcParam) {
		retArr.push('{\n');
		for (let i = 0; i < bNode.body.length; i++) {
			this.astGeneric(bNode.body[i], retArr, funcParam);
		}
		retArr.push('}\n');
		return retArr;
	}

	astExpressionStatement(esNode, retArr, funcParam) {
		this.astGeneric(esNode.expression, retArr, funcParam);
		retArr.push(';\n');
		return retArr;
	}

	astVariableDeclaration(vardecNode, retArr, funcParam) {
		retArr.push('float ');
		for (let i = 0; i < vardecNode.declarations.length; i++) {
			if (i > 0) {
				retArr.push(',');
			}
			this.astGeneric(vardecNode.declarations[i], retArr, funcParam);
		}
		retArr.push(';');
		return retArr;
	}

	astVariableDeclarator(ivardecNode, retArr, funcParam) {
		this.astGeneric(ivardecNode.id, retArr, funcParam);
		if (ivardecNode.init !== null) {
			retArr.push('=');
			this.astGeneric(ivardecNode.init, retArr, funcParam);
		}
		return retArr;
	}

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

	astBreakStatement(brNode, retArr, funcParam) {
		retArr.push('break;\n');
		return retArr;
	}

	astContinueStatement(crNode, retArr, funcParam) {
		retArr.push('continue;\n');
		return retArr;
	}

	astLogicalExpression(logNode, retArr, funcParam) {
		retArr.push('(');
		this.astGeneric(logNode.left, retArr, funcParam);
		retArr.push(logNode.operator);
		this.astGeneric(logNode.right, retArr, funcParam);
		retArr.push(')');
		return retArr;
	}

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

	astThisExpression(tNode, retArr, funcParam) {
		retArr.push('this');
		return retArr;
	}


	astMemberExpression(mNode, retArr, funcParam) {
		if (mNode.computed) {
			if (mNode.object.type === 'Identifier') {
				// Working logger
				const reqName = mNode.object.name;
				const funcName = funcParam.functionName || 'kernel';
				let assumeNotTexture = false;

				// Possibly an array request - handle it as such
				if (funcParam.paramNames) {
					const idx = funcParam.paramNames.indexOf(reqName);
					if (idx >= 0 && funcParam.paramType[idx] === 'float') {
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
				const last = retArr.pop();
				retArr.push(',');
				this.astGeneric(mNode.property, retArr, funcParam);
				retArr.push(last);
			}
		} else {

			// Unroll the member expression
			let unrolled = this.astMemberExpressionUnroll(mNode);
			let unrolled_lc = unrolled.toLowerCase();

			// Its a constant, remove this.constants.
			if (unrolled.indexOf(constantsPrefix) === 0) {
				unrolled = 'constants_' + unrolled.slice(constantsPrefix.length);
			}

			if (unrolled_lc === 'this.thread.x') {
				retArr.push('threadId.x');
			} else if (unrolled_lc === 'this.thread.y') {
				retArr.push('threadId.y');
			} else if (unrolled_lc === 'this.thread.z') {
				retArr.push('threadId.z');
			} else if (unrolled_lc === 'this.dimensions.x') {
				retArr.push('uOutputDim.x');
			} else if (unrolled_lc === 'this.dimensions.y') {
				retArr.push('uOutputDim.y');
			} else if (unrolled_lc === 'this.dimensions.z') {
				retArr.push('uOutputDim.z');
			} else {
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

	/// Utility function for astCallExpression.
	///
	/// Parses the abstract syntax tree, binary expression.
	///
	/// @param ast          the AST object to parse
	///
	/// @returns  {String} the function namespace call, unrolled
	astMemberExpressionUnroll(ast, funcParam) {
		if (ast.type === 'Identifier') {
			return ast.name;
		} else if (ast.type === 'ThisExpression') {
			return 'this';
		}

		if (ast.type === 'MemberExpression') {
			if (ast.object && ast.property) {
				return (
					this.astMemberExpressionUnroll(ast.object, funcParam) +
					'.' +
					this.astMemberExpressionUnroll(ast.property, funcParam)
				);
			}
		}

		// Failure, unknown expression
		throw astErrorOutput(
			'Unknown CallExpression_unroll',
			ast, funcParam
		);
	}

	/// Parses the abstract syntax tree, binary expression
	///
	/// @param ast          the AST object to parse
	/// @param retArr       return array string
	/// @param funcParam    FunctionNode, that tracks compilation state
	///
	/// @returns  the appended retArr
	astCallExpression(ast, retArr, funcParam) {
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

			// Register the function into the called registry
			if (funcParam.calledFunctions.indexOf(funcName) < 0) {
				funcParam.calledFunctions.push(funcName);
			}

			// Call the function
			retArr.push(funcName);

			// Open arguments space
			retArr.push('(');

			// Add the vars
			for (let i = 0; i < ast.arguments.length; ++i) {
				if (i > 0) {
					retArr.push(', ');
				}
				this.astGeneric(ast.arguments[i], retArr, funcParam);
			}

			// Close arguments space
			retArr.push(')');

			return retArr;
		}

		// Failure, unknown expression
		throw astErrorOutput(
			'Unknown CallExpression',
			ast, funcParam
		);

		return retArr;
	}

	/// Parses the abstract syntax tree, Array Expression
	///
	/// @param ast          the AST object to parse
	/// @param retArr       return array string
	/// @param funcParam    FunctionNode, that tracks compilation state
	///
	/// @returns  the append retArr
	astArrayExpression(arrNode, retArr, funcParam) {
		const arrLen = arrNode.elements.length;

		retArr.push('float[' + arrLen + '](');
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
		// throw astErrorOutput(
		// 	'Unknown  ArrayExpression',
		// 	arrNode, funcParam
		//);
	}

	///
	/// Function: getFunctionPrototypeString
	///
	/// Returns the converted webgl shader function equivalent of the JS function
	///
	/// Returns:
	/// 	{String} webgl function string, result is cached under this.getFunctionPrototypeString
	///
	getFunctionPrototypeString(options) {
		if (this.webGlFunctionPrototypeString) {
			return this.webGlFunctionPrototypeString;
		}
		return this.webGlFunctionPrototypeString = this.generate(options);
	}

	build(options) {
		return this.getFunctionPrototypeString(options).length > 0;
	}
};