const FunctionNodeBase = require('../function-node-base');
const utils = require('../../core/utils');
// Closure capture for the ast function, prevent collision with existing AST functions
// The prefixes to use
const jsMathPrefix = 'Math.';
const localPrefix = 'this.';
const constantsPrefix = 'this.constants.';

const DECODE32_ENCODE32 = /decode32\(\s+encode32\(/g;
const ENCODE32_DECODE32 = /encode32\(\s+decode32\(/g;

/// 
/// Class: WebGLFunctionNode
///
/// [INTERNAL] Takes in a function node, and does all the AST voodoo required to generate its respective webGL code.
///
/// Extends: 
///		FunctionNodeBase
///
/// Parameter:
/// 	inNode - {functionNode} The function node object
///
/// Returns:
/// 	the converted webGL function string
///
module.exports = class WebGLFunctionNode extends FunctionNodeBase {
	generate() {
		if (this.debug) {
			console.log(this);
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

	isIdentifierConstant(paramName) {
		if (!this.constants) return false;
		return this.constants.hasOwnProperty(paramName);
	}

	///
	/// Function: astGeneric
	///
	/// Parses the abstract syntax tree for generically to its respective function
	///
	/// Parameters:
	///  	ast         - the AST object to parse
	///  	retArr      - return array string
	///  	funcParam   - FunctionNode, that tracks compilation state
	///
	/// Returns:
	///		the prased openclgl string array
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

	///
	/// Function: astFunctionDeclaration
	///
	/// Parses the abstract syntax tree for to its *named function declaration*
	///
	///  	ast   		- the AST object to parse
	///  	retArr      - return array string
	///  	funcParam   - FunctionNode, that tracks compilation state
	///
	/// Returns: 
	///		 the append retArr
	astFunctionDeclaration(ast, retArr, funcParam) {
		if (this.addFunction) {
			this.addFunction(null, utils.getAstString(this.jsFunctionString, ast));
		}
		return retArr;
	}

	///
	/// Function: astFunctionPrototype
	///
	/// Parses the abstract syntax tree for to its *named function prototype*
	///
	/// Parameters:
	///  	ast   		- the AST object to parse
	///  	retArr      - return array string
	///  	funcParam   - FunctionNode, that tracks compilation state
	///
	/// Returns: 
	///		 the append retArr
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

	///
	/// Function: astFunctionExpression
	///
	/// Parses the abstract syntax tree for to its *named function*
	///
	/// Parameters: 
	///  	ast   		- the AST object to parse
	///  	retArr      - return array string
	///  	funcParam   - FunctionNode, that tracks compilation state
	///
	/// Returns: 
	///		 the append retArr
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
				const paramName = funcParam.paramNames[i];

				if (i > 0) {
					retArr.push(', ');
				}
				const type = funcParam.getParamType(paramName);
				switch (type) {
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
		for (let i = 0; i < ast.body.length; ++i) {
			this.astGeneric(ast.body[i], retArr, funcParam);
			retArr.push('\n');
		}

		// Function closing
		retArr.push('}\n');
		return retArr;
	}

	///
	/// Function: astReturnStatement
	///
	/// Parses the abstract syntax tree for to *return* statement
	///
	/// Parameters: 
	///  	ast   		- the AST object to parse
	///  	retArr      - return array string
	///  	funcParam   - FunctionNode, that tracks compilation state
	///
	/// Returns: 
	///		 the append retArr
	astReturnStatement(ast, retArr, funcParam) {
		if (funcParam.isRootKernel) {
			retArr.push('kernelResult = ');
			this.astGeneric(ast.argument, retArr, funcParam);
			retArr.push(';');
			retArr.push('return;');
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

		//throw astErrorOutput(
		//	'Non main function return, is not supported : '+funcParam.currentFunctionNamespace,
		//	ast, funcParam
		//);

		return retArr;
	}

	///
	/// Function: astLiteral
	///
	/// Parses the abstract syntax tree for *literal value*
	///
	/// Parameters:
	///  	ast   		- the AST object to parse
	///  	retArr      - return array string
	///  	funcParam   - FunctionNode, that tracks compilation state
	///
	/// Returns: 
	///		 the append retArr
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

	///
	/// Function: astBinaryExpression
	///
	/// Parses the abstract syntax tree for *binary* expression
	///
	/// Parameters:
	///  	ast   		- the AST object to parse
	///  	retArr      - return array string
	///  	funcParam   - FunctionNode, that tracks compilation state
	///
	/// Returns: 
	///		 the append retArr
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

	///
	/// Function: astIdentifierExpression
	///
	/// Parses the abstract syntax tree for *identifier* expression
	///
	/// Parameters:
	///  	idtNode   	- An ast Node
	///  	retArr      - return array string
	///  	funcParam   - FunctionNode, that tracks compilation state
	///
	/// Returns: 
	///		 the append retArr
	astIdentifierExpression(idtNode, retArr, funcParam) {
		if (idtNode.type !== 'Identifier') {
			throw astErrorOutput(
				'IdentifierExpression - not an Identifier',
				ast, funcParam
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
			case 'gpu_dimensionsX':
				retArr.push('uOutputDim.x');
				break;
			case 'gpu_dimensionsY':
				retArr.push('uOutputDim.y');
				break;
			case 'gpu_dimensionsZ':
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

	///
	/// Function: astForStatement
	///
	/// Parses the abstract syntax tree forfor *for-loop* expression
	///
	/// Parameters:
	///
	///  	forNode   	- An ast Node
	///  	retArr      - return array string
	///  	funcParam   - FunctionNode, that tracks compilation state
	///
	/// Returns: 
	///		 the prased openclgl string
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
					throw new Error('Error: Incompatible for loop declaration');
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

	///
	/// Function: astWhileStatement
	///
	/// Parses the abstract syntax tree for *while* loop
	///
	/// Parameters:
	///
	///  	whileNode   - An ast Node
	///  	retArr      - return array string
	///  	funcParam   - FunctionNode, that tracks compilation state
	///
	/// Returns: 
	///		 the parsed openclgl string
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

	///
	/// Function: astAssignmentExpression
	///
	/// Parses the abstract syntax tree for *Assignment* Expression
	///
	/// Parameters:
	///  	assNode   	- An ast Node
	///  	retArr      - return array string
	///  	funcParam   - FunctionNode, that tracks compilation state
	///
	/// Returns: 
	///		 the append retArr
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

	///
	/// Function: astEmptyStatement
	///
	/// Parses the abstract syntax tree for an *Empty* Statement
	///
	/// Parameters:
	///  	eNode   	- An ast Node
	///  	retArr      - return array string
	///  	funcParam   - FunctionNode, that tracks compilation state
	///
	/// Returns: 
	///		 the append retArr
	astEmptyStatement(eNode, retArr, funcParam) {
		//retArr.push(';\n');
		return retArr;
	}

	///
	/// Function: astBlockStatement
	///
	/// Parses the abstract syntax tree for *Block* statement
	///
	/// Parameters:
	///  	bnode        the AST object to parse
	///  	retArr      - return array string
	///  	funcParam   - FunctionNode, that tracks compilation state
	///
	/// Returns: 
	///		 the append retArr
	astBlockStatement(bNode, retArr, funcParam) {
		retArr.push('{\n');
		for (let i = 0; i < bNode.body.length; i++) {
			this.astGeneric(bNode.body[i], retArr, funcParam);
		}
		retArr.push('}\n');
		return retArr;
	}

	///
	/// Function: astExpressionStatement
	///
	/// Parses the abstract syntax tree for *generic expression* statement
	///
	/// Parameters:
	///  	esNode   	- An ast Node
	///  	retArr      - return array string
	///  	funcParam   - FunctionNode, that tracks compilation state
	///
	/// Returns: 
	///		 the append retArr
	astExpressionStatement(esNode, retArr, funcParam) {
		this.astGeneric(esNode.expression, retArr, funcParam);
		retArr.push(';\n');
		return retArr;
	}

	///
	/// Function: astVariableDeclaration
	///
	/// Parses the abstract syntax tree for *Variable Declaration*
	///
	/// Parameters:
	///  	vardecNode   	- An ast Node
	///  	retArr      - return array string
	///  	funcParam   - FunctionNode, that tracks compilation state
	///
	/// Returns: 
	///		 the append retArr
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

	///
	/// Function: astVariableDeclarator
	///
	/// Parses the abstract syntax tree for *Variable Declarator*
	///
	/// Parameters:
	///  	ivardecNode   	- An ast Node
	///  	retArr      - return array string
	///  	funcParam   - FunctionNode, that tracks compilation state
	///
	/// Returns: 
	///		 the append retArr
	astVariableDeclarator(ivardecNode, retArr, funcParam) {
		this.astGeneric(ivardecNode.id, retArr, funcParam);
		if (ivardecNode.init !== null) {
			retArr.push('=');
			this.astGeneric(ivardecNode.init, retArr, funcParam);
		}
		return retArr;
	}

	///
	/// Function: astIfStatement
	///
	/// Parses the abstract syntax tree for *If* Statement
	///
	/// Parameters:
	///  	ifNode   	- An ast Node
	///  	retArr      - return array string
	///  	funcParam   - FunctionNode, that tracks compilation state
	///
	/// Returns: 
	///		 the append retArr
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

	///
	/// Function: astBreakStatement
	///
	/// Parses the abstract syntax tree for *Break* Statement
	///
	/// Parameters:
	///  	brNode   	- An ast Node
	///  	retArr      - return array string
	///  	funcParam   - FunctionNode, that tracks compilation state
	///
	/// Returns: 
	///		 the append retArr
	astBreakStatement(brNode, retArr, funcParam) {
		retArr.push('break;\n');
		return retArr;
	}

	///
	/// Function: astContinueStatement
	///
	/// Parses the abstract syntax tree for *Continue* Statement
	///
	/// Parameters:
	///  	crNode   	- An ast Node
	///  	retArr      - return array string
	///  	funcParam   - FunctionNode, that tracks compilation state
	///
	/// Returns: 
	///		 the append retArr
	astContinueStatement(crNode, retArr, funcParam) {
		retArr.push('continue;\n');
		return retArr;
	}

	///
	/// Function: astLogicalExpression
	///
	/// Parses the abstract syntax tree for *Logical* Expression
	///
	/// Parameters:
	///  	logNode   	- An ast Node
	///  	retArr      - return array string
	///  	funcParam   - FunctionNode, that tracks compilation state
	///
	/// Returns: 
	///		 the append retArr
	astLogicalExpression(logNode, retArr, funcParam) {
		retArr.push('(');
		this.astGeneric(logNode.left, retArr, funcParam);
		retArr.push(logNode.operator);
		this.astGeneric(logNode.right, retArr, funcParam);
		retArr.push(')');
		return retArr;
	}

	///
	/// Function: astUpdateExpression
	///
	/// Parses the abstract syntax tree for *Update* Expression
	///
	/// Parameters:
	///  	uNode   	- An ast Node
	///  	retArr      - return array string
	///  	funcParam   - FunctionNode, that tracks compilation state
	///
	/// Returns: 
	///		 the append retArr
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

	///
	/// Function: astUnaryExpression
	///
	/// Parses the abstract syntax tree for *Unary* Expression
	///
	/// Parameters:
	///  	uNode   	- An ast Node
	///  	retArr      - return array string
	///  	funcParam   - FunctionNode, that tracks compilation state
	///
	/// Returns: 
	///		 the append retArr
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

	///
	/// Function: astThisExpression
	///
	/// Parses the abstract syntax tree for *This* expression
	///
	/// Parameters:
	///  	tNode   	- An ast Node
	///  	retArr      - return array string
	///  	funcParam   - FunctionNode, that tracks compilation state
	///
	/// Returns: 
	///		 the append retArr
	astThisExpression(tNode, retArr, funcParam) {
		retArr.push('this');
		return retArr;
	}

	///
	/// Function: astMemberExpression
	///
	/// Parses the abstract syntax tree for *Member* Expression
	///
	/// Parameters:
	///  	mNode   	- An ast Node
	///  	retArr      - return array string
	///  	funcParam   - FunctionNode, that tracks compilation state
	///
	/// Returns: 
	///		 the append retArr
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
					if (idx >= 0 && funcParam.paramTypes[idx] === 'float') {
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
	/// Parses the abstract syntax tree for binary expression.
	///
	/// Parameters:
	///  	ast         the AST object to parse
	///		funcParam
	/// Returns: 
	///		 {String} the function namespace call, unrolled
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

	///
	/// Function: astCallExpression
	///
	/// Parses the abstract syntax tree for *call* expression
	///
	/// Parameters:
	///
	///  	ast   		- the AST object to parse
	///  	retArr      - return array string
	///  	funcParam   - FunctionNode, that tracks compilation state
	///
	/// Returns: 
	///		the appended retArr
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
		throw astErrorOutput(
			'Unknown CallExpression',
			ast, funcParam
		);

		return retArr;
	}

	///
	/// Function: astArrayExpression
	///
	/// Parses the abstract syntax tree for *Array* Expression
	///
	/// Parameters:
	///  	ast   		- the AST object to parse
	///  	retArr      - return array string
	///  	funcParam   - FunctionNode, that tracks compilation state
	///
	/// Returns:  
	///		the append retArr
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

	if (!isIdentifierKernelParam(paramName, funcParam) && expectedType !== 'float') {
		throw 'Error unexpected identifier ' + paramName + ' on line ' + start.line;
	} else {
		const actualType = funcParam.paramTypes[funcParam.paramNames.indexOf(paramName)];
		if (actualType !== expectedType) {
			throw 'Error unexpected identifier ' + paramName + ' on line ' + start.line;
		}
	}
}

///
/// Function: webgl_regex_optimize
///
/// [INTERNAL] Takes the near final webgl function string, and do regex search and replacments.
/// For voodoo optimize out the following
///
/// - decode32(encode32(
/// - encode32(decode32(
///
/// Parameters:
/// 	inStr - {String} 	The webGl function String
///
function webGlRegexOptimize(inStr) {
	return inStr
		.replace(DECODE32_ENCODE32, '((')
		.replace(ENCODE32_DECODE32, '((');
}

///
/// Function: astErrorOutput
///
/// To throw the AST error, with its location.
///
/// @TODO: add location support fpr the AST error
///
/// Parameters:
///  	error        - the error message output
///  	ast          - the AST object where the error is
///  	funcParam    - FunctionNode, that tracks compilation state
function astErrorOutput(error, ast, funcParam) {
	console.error(error, ast, funcParam);
	return error;
}