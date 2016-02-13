// Closure capture for the ast function, prevent collision with existing AST functions
var functionNode_webgl = (function() {
	
	///
	/// @function  functionNode_webgl
	///
	/// Takes in a function node, and does all the AST voodoo required to generate its respective webGL code.
	/// 
	/// @param {functionNode}  The function node object
	/// 
	/// @returns the webGL function string
	///
	function functionNode_webgl( inNode ) {
		inNode.webglFunctionString_array = ast_generic( inNode.getJS_AST(), [], inNode );
		inNode.webglFunctionString = inNode.webglFunctionString_array.join("");
		return inNode.webglFunctionString;
	}
	
	/// the AST error, with its location. To throw 
	///
	/// @TODO: add location support fpr the AST error
	///
	/// @param error        the error message output
	/// @param ast          the AST object where the error is
	/// @param stateParam   the compiled state tracking
	function ast_errorOutput(error, ast, stateParam) {
		console.error(error, ast, stateParam);
		return error;
	}
	
	/// Prases the abstract syntax tree, genericially to its respective function
	///
	/// @param ast          the AST object to parse
	/// @param retArr       return array string
	/// @param stateParam   the compiled state tracking
	///
	/// @returns  the prased openclgl string array
	function ast_generic(ast, retArr, stateParam) {
		if(ast === null) {
			throw ast_errorOutput("NULL ast", ast, stateParam);
		} else {
			if (Array.isArray(ast)) {
				for (var i=0; i<ast.length; i++) {
					ast_generic(ast[i], retArr, stateParam);
				}
				return retArr;
			}
			
			switch(ast.type) {
				case "FunctionExpression":
					return ast_FunctionExpression(ast, retArr, stateParam);
				case "ReturnStatement":
					return ast_ReturnStatement(ast, retArr, stateParam);
				case "Literal":
					return ast_Literal(ast, retArr,  stateParam);
				case "BinaryExpression":
					return ast_BinaryExpression(ast, retArr,  stateParam);
				case "Identifier":
					return ast_IdentifierExpression(ast, retArr, stateParam);
				case "AssignmentExpression":
					return ast_AssignmentExpression(ast, retArr, stateParam);
				case "ExpressionStatement":
					return ast_ExpressionStatement(ast, retArr, stateParam);
				case "EmptyStatement":
					return ast_EmptyStatement(ast, retArr, stateParam);
				case "BlockStatement":
					return ast_BlockStatement(ast, retArr, stateParam);
				case "IfStatement":
					return ast_IfStatement(ast, retArr, stateParam);
				case "BreakStatement":
					return ast_BreakStatement(ast, retArr, stateParam);
				case "ContinueStatement":
					return ast_ContinueStatement(ast, retArr, stateParam);
				case "ForStatement":
					return ast_ForStatement(ast, retArr, stateParam);
				case "VariableDeclaration":
					return ast_VariableDeclaration(ast, retArr, stateParam);
				case "VariableDeclarator":
					return ast_VariableDeclarator(ast, retArr, stateParam);
				case "ThisExpression":
					return ast_ThisExpression(ast, retArr, stateParam);
				case "SequenceExpression":
					return ast_SequenceExpression(ast, retArr, stateParam);
				case "UnaryExpression":
					return ast_UnaryExpression(ast, retArr, stateParam);
				case "UpdateExpression":
					return ast_UpdateExpression(ast, retArr, stateParam);
				case "LogicalExpression":
					return ast_LogicalExpression(ast, retArr, stateParam);
				case "MemberExpression":
					return ast_MemberExpression(ast, retArr, stateParam);
				case "CallExpression":
					return ast_CallExpression(ast, retArr, stateParam);
			}
			
			throw ast_errorOutput("Unknown ast type : "+ast.type, ast, stateParam);
		}
	}
	
	/// Prases the abstract syntax tree, to its named function
	///
	/// @param ast   the AST object to parse
	/// @param retArr       return array string
	/// @param stateParam   the compiled state tracking
	///
	/// @returns  the appened retArr
	function ast_FunctionExpression(ast, retArr, stateParam) {
		
		stateParam.currentFunctionNamespace = ast.id;
		
		// Handle parameters tokens
		var paramsNode = ast.params;
		retArr.push("vec4 kernel() {\n");
		
		// Body statement iteration
		for(var i=0; i<ast.body.length; ++i) {
			ast_generic(ast.body[i], retArr, stateParam);
			retArr.push("\n");
		}
		
		// Function closing
		retArr.push("\n}");
		return retArr;
	}
	
	/// Prases the abstract syntax tree, to return function
	///
	/// @param ast          the AST object to parse
	/// @param retArr       return array string
	/// @param stateParam   the compiled state tracking
	///
	/// @returns  the appened retArr
	function ast_ReturnStatement(ast, retArr, stateParam) {
		if( stateParam.currentFunctionNamespace == "main" ) {
			retArr.push("return encode32(");
			ast_generic(ast.argument, retArr, stateParam);
			retArr.push("); ");
		} else {
			throw ast_errorOutput(
				"Non main function return, is not supported : "+stateParam.currentFunctionNamespace,
				ast, stateParam
			);
		}
		
		return retArr;
	}
	
	/// Prases the abstract syntax tree, literal value
	///
	/// @param ast          the AST object to parse
	/// @param retArr       return array string
	/// @param stateParam   the compiled state tracking
	///
	/// @returns  the appened retArr
	function ast_Literal(ast, retArr, stateParam) {
		
		// Reject non numeric literals
		if( isNaN(ast.value) ) {
			throw ast_errorOutput(
				"Non-numeric literal not supported : "+ast.value,
				ast, stateParam
			);
		}
		
		// Push the literal value as a float/int
		retArr.push( ast.value );
		
		// If it was an int, node made a float
		if( Number.isInteger(ast.value) ) {
			retArr.push(".0");
		}
		
		return retArr;
	}
	
	/// Prases the abstract syntax tree, binary expression
	///
	/// @param ast          the AST object to parse
	/// @param retArr       return array string
	/// @param stateParam   the compiled state tracking
	///
	/// @returns  the appened retArr
	function ast_BinaryExpression(ast, retArr, stateParam) {
		if (ast.operator == "%") {
			retArr.push("mod(");
			ast_generic(ast.left, retArr, stateParam);
			retArr.push(",");
			ast_generic(ast.right, retArr, stateParam);
			retArr.push(")");
		} else {
			ast_generic(ast.left, retArr, stateParam);
			retArr.push(ast.operator);
			ast_generic(ast.right, retArr, stateParam);
		}

		return retArr;
	}
	
	/// Prases the abstract syntax tree, identifier expression
	///
	/// @param ast          the AST object to parse
	/// @param retArr       return array string
	/// @param stateParam   the compiled state tracking
	///
	/// @returns  the appened retArr
	function ast_IdentifierExpression(idtNode, retArr, stateParam) {
		if (idtNode.type != "Identifier") {
			throw ast_errorOutput(
				"IdentifierExpression - not an Identifier",
				ast, stateParam
			);
		}
		
		if (idtNode.name == "gpu_threadX") {
			retArr.push('threadId.x');
		} else if (idtNode.name == "gpu_threadY") {
			retArr.push('threadId.y');
		} else if (idtNode.name == "gpu_threadZ") {
			retArr.push('threadId.z');
		} else if (idtNode.name == "gpu_dimensionsX") {
			retArr.push('uOutputDim.x');
		} else if (idtNode.name == "gpu_dimensionsY") {
			retArr.push('uOutputDim.y');
		} else if (idtNode.name == "gpu_dimensionsZ") {
			retArr.push('uOutputDim.z');
		} else {
			retArr.push('user_' + idtNode.name);
		}

		return retArr;
	}
	
	/// Prases the abstract syntax tree, genericially to its respective function
	///
	/// @param ast   the AST object to parse
	///
	/// @returns  the prased openclgl string
	function ast_ForStatement(forNode, retArr, stateParam) {
		if (forNode.type != "ForStatement") {
			throw "error";
		}
		retArr.push("for (float ");
		ast_generic(forNode.init, retArr, stateParam);
		retArr.push(";");
		ast_generic(forNode.test, retArr, stateParam);
		retArr.push(";");
		ast_generic(forNode.update, retArr, stateParam);
		retArr.push(")");
		ast_generic(forNode.body, retArr, stateParam);
		return retArr;
	}

	function ast_AssignmentExpression(assNode, retArr, stateParam) {
		if(assNode.operator == "%=") {
			ast_generic(assNode.left, retArr, stateParam);
			retArr.push("=");
			retArr.push("mod(");
			ast_generic(assNode.left, retArr, stateParam);
			retArr.push(",");
			ast_generic(assNode.right, retArr, stateParam);
			retArr.push(")");
		} else {
			ast_generic(assNode.left, retArr, stateParam);
			retArr.push(assNode.operator);
			ast_generic(assNode.right, retArr, stateParam);
			return retArr;
		}
	}

	function ast_EmptyStatement(eNode, retArr, stateParam) {
		retArr.push(";\n");
		return retArr;
	}

	function ast_BlockStatement(bNode, retArr, stateParam) {
		retArr.push("{\n");
		for (var i = 0; i < bNode.body.length; i++) {
			ast_generic(bNode.body[i], retArr, stateParam);
		}
		retArr.push("}\n");
		return retArr;
	}

	function ast_ExpressionStatement(esNode, retArr, stateParam) {
		ast_generic(esNode.expression, retArr, stateParam);
		retArr.push(";\n");
		return retArr;
	}

	function ast_VariableDeclaration(vardecNode, retArr, stateParam) {
		retArr.push("float ");
		for (var i = 0; i < vardecNode.declarations.length; i++) {
			if (i > 0) {
				retArr.push(",");
			}
			ast_generic(vardecNode.declarations[i], retArr, stateParam);
		}
		retArr.push(";");
		return retArr;
	}

	function ast_VariableDeclarator(ivardecNode, retArr, stateParam) {
		
		ast_generic(ivardecNode.id, retArr, stateParam);
		if (ivardecNode.init !== null) {
			retArr.push("=");
			ast_generic(ivardecNode.init, retArr, stateParam);
		}
		return retArr;
	}

	function ast_IfStatement(ifNode, retArr, stateParam) {
		retArr.push("if(");
		ast_generic(ifNode.test, retArr, stateParam);
		retArr.push(")");
		ast_generic(ifNode.consequent, retArr, stateParam);
		retArr.push("else");
		ast_generic(ifNode.alternate, retArr, stateParam);
		return retArr;

	}

	function ast_Break(brNode, retArr, stateParam) {
		retArr.push("break;\n");
		return retArr;
	}

	function ast_Continue(crNode, retArr, stateParam) {
		retArr.push("continue;\n");
		return retArr;
	}

	function ast_LogicalExpression(logNode, retArr, stateParam) {
		ast_generic(logNode.left, retArr, stateParam);
		ast_generic(logNode.operator, retArr, stateParam);
		ast_generic(logNode.right, retArr, stateParam);
		return retArr;
	}

	function ast_UpdateExpression(uNode, retArr, stateParam) {
		if(uNode.prefix) {
			retArr.push(uNode.operator);
			ast_generic(uNode.argument, retArr, stateParam);
		} else {
			ast_generic(uNode.argument, retArr, stateParam);
			retArr.push(uNode.operator);
		}

		return retArr;
	}

	function ast_UnaryExpression(uNode, retArr, stateParam) {
		if(uNode.prefix) {
			retArr.push(uNode.operator);
			ast_generic(uNode.argument, retArr, stateParam);
		} else {
			ast_generic(uNode.argument, retArr, stateParam);
			retArr.push(uNode.operator);
		}

		return retArr;
	}

	function ast_ThisExpression(tNode, retArr, stateParam) {
		retArr.push("this");

		return retArr;
	}

	function ast_MemberExpression(mNode, retArr, stateParam) {
		if(mNode.computed) {
			if (mNode.object.type == "Identifier") {
				retArr.push("get(");
				ast_generic(mNode.object, retArr, stateParam);
				retArr.push(", vec2(");
				ast_generic(mNode.object, retArr, stateParam);
				retArr.push("Size[0],");
				ast_generic(mNode.object, retArr, stateParam);
				retArr.push("Size[1]), vec3(");
				ast_generic(mNode.object, retArr, stateParam);
				retArr.push("Dim[0],");
				ast_generic(mNode.object, retArr, stateParam);
				retArr.push("Dim[1],");
				ast_generic(mNode.object, retArr, stateParam);
				retArr.push("Dim[2]");
				retArr.push("), ");
			} else {
				ast_generic(mNode.object, retArr, stateParam);
				var last = retArr.pop();
				retArr.push(",");
			}
			ast_generic(mNode.property, retArr, stateParam);
			retArr.push(")");
		} else {
			ast_generic(mNode.object, retArr, stateParam);
			retArr.push(".");
			ast_generic(mNode.property, retArr, stateParam);
		}
		return retArr;
	}

	function ast_SequenceExpression(sNode, retArr, stateParam) {
		for (var i = 0; i < sNode.expressions.length; i++) {
			if (i > 0) {
				retArr.push(",");
			}
			ast_generic(sNode.expressions, retArr, stateParam);
		}
		return retArr;
	}
	
	/// Prases the abstract syntax tree, binary expression
	///
	/// @param ast          the AST object to parse
	/// @param retArr       return array string
	/// @param stateParam   the compiled state tracking
	///
	/// @returns  the appened retArr
	function ast_CallExpression(ast, retArr, stateParam) {
		var mathPrefix = "gpu_math_";
		var mathPrefixLen = mathPrefix.length;
		
		var fName = ast.callee.name;
		if( fName.slice(0,mathPrefixLen) == mathPrefix ) {
			var mathSuffix = fName.slice(mathPrefixLen);
			
			retArr.push(mathSuffix);
			retArr.push("(");
			
			if(ast.arguments) {
				var aLen = ast.arguments.length;
				for( var i = 0; i < aLen; ++i ) {
					ast_generic(ast.arguments[i], retArr, stateParam);
					
					if( i+1 < aLen ) {
						retArr.push(", ");
					}
				}
			}
			
			retArr.push(")");
		} else {
			throw ast_errorOutput(
				"Unknown CallExpression : "+mathPrefix,
				ast, stateParam
			);
		}
		
		return retArr;
	}
	
	return functionNode_webgl;
})();
