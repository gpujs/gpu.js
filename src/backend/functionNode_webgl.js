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
		inNode.webglFunctionString = inNode.webglFunctionString_array.join("").trim();
		return inNode.webglFunctionString;
	}
	
	/// the AST error, with its location. To throw 
	///
	/// @TODO: add location support fpr the AST error
	///
	/// @param error        the error message output
	/// @param ast          the AST object where the error is
	/// @param funcParam    FunctionNode, that tracks compilation state
	function ast_errorOutput(error, ast, funcParam) {
		console.error(error, ast, funcParam);
		return error;
	}
	
	/// Prases the abstract syntax tree, genericially to its respective function
	///
	/// @param ast          the AST object to parse
	/// @param retArr       return array string
	/// @param funcParam    FunctionNode, that tracks compilation state
	///
	/// @returns  the prased openclgl string array
	function ast_generic(ast, retArr, funcParam) {
		if(ast === null) {
			throw ast_errorOutput("NULL ast", ast, funcParam);
		} else {
			if (Array.isArray(ast)) {
				for (var i=0; i<ast.length; i++) {
					ast_generic(ast[i], retArr, funcParam);
				}
				return retArr;
			}
			
			switch(ast.type) {
				case "FunctionExpression":
					return ast_FunctionExpression(ast, retArr, funcParam);
				case "ReturnStatement":
					return ast_ReturnStatement(ast, retArr, funcParam);
				case "Literal":
					return ast_Literal(ast, retArr,  funcParam);
				case "BinaryExpression":
					return ast_BinaryExpression(ast, retArr,  funcParam);
				case "Identifier":
					return ast_IdentifierExpression(ast, retArr, funcParam);
				case "AssignmentExpression":
					return ast_AssignmentExpression(ast, retArr, funcParam);
				case "ExpressionStatement":
					return ast_ExpressionStatement(ast, retArr, funcParam);
				case "EmptyStatement":
					return ast_EmptyStatement(ast, retArr, funcParam);
				case "BlockStatement":
					return ast_BlockStatement(ast, retArr, funcParam);
				case "IfStatement":
					return ast_IfStatement(ast, retArr, funcParam);
				case "BreakStatement":
					return ast_BreakStatement(ast, retArr, funcParam);
				case "ContinueStatement":
					return ast_ContinueStatement(ast, retArr, funcParam);
				case "ForStatement":
					return ast_ForStatement(ast, retArr, funcParam);
				case "VariableDeclaration":
					return ast_VariableDeclaration(ast, retArr, funcParam);
				case "VariableDeclarator":
					return ast_VariableDeclarator(ast, retArr, funcParam);
				case "ThisExpression":
					return ast_ThisExpression(ast, retArr, funcParam);
				case "SequenceExpression":
					return ast_SequenceExpression(ast, retArr, funcParam);
				case "UnaryExpression":
					return ast_UnaryExpression(ast, retArr, funcParam);
				case "UpdateExpression":
					return ast_UpdateExpression(ast, retArr, funcParam);
				case "LogicalExpression":
					return ast_LogicalExpression(ast, retArr, funcParam);
				case "MemberExpression":
					return ast_MemberExpression(ast, retArr, funcParam);
				case "CallExpression":
					return ast_CallExpression(ast, retArr, funcParam);
			}
			
			throw ast_errorOutput("Unknown ast type : "+ast.type, ast, funcParam);
		}
	}
	
	/// Prases the abstract syntax tree, to its named function
	///
	/// @param ast   the AST object to parse
	/// @param retArr       return array string
	/// @param funcParam    FunctionNode, that tracks compilation state
	///
	/// @returns  the appened retArr
	function ast_FunctionExpression(ast, retArr, funcParam) {
		
		// Setup function return type and name
		retArr.push(funcParam.returnType);
		retArr.push(" ");
		retArr.push(funcParam.functionName);
		retArr.push("(");
		
		// Arguments handling
		for( var i = 0; i < funcParam.paramNames.length; ++i ) {
			if( i > 0 ) {
				retArr.push(", ");
			}
			
			retArr.push( funcParam.paramType[i] );
			retArr.push(" ");
			retArr.push( funcParam.paramNames[i] );
		}
		
		// Function opening
		retArr.push(") {\n");
		
		// Body statement iteration
		for(var i=0; i<ast.body.length; ++i) {
			ast_generic(ast.body[i], retArr, funcParam);
			retArr.push("\n");
		}
		
		// Function closing
		retArr.push("}\n");
		return retArr;
	}
	
	/// Prases the abstract syntax tree, to return function
	///
	/// @param ast          the AST object to parse
	/// @param retArr       return array string
	/// @param funcParam    FunctionNode, that tracks compilation state
	///
	/// @returns  the appened retArr
	function ast_ReturnStatement(ast, retArr, funcParam) {
		if( funcParam.isRootKernal ) {
			retArr.push("return encode32(");
			ast_generic(ast.argument, retArr, funcParam);
			retArr.push("); ");
		} else {
			retArr.push("return ");
			ast_generic(ast.argument, retArr, funcParam);
			retArr.push(";");
		}
		
		//throw ast_errorOutput(
		//	"Non main function return, is not supported : "+funcParam.currentFunctionNamespace,
		//	ast, funcParam
		//);
		
		return retArr;
	}
	
	/// Prases the abstract syntax tree, literal value
	///
	/// @param ast          the AST object to parse
	/// @param retArr       return array string
	/// @param funcParam    FunctionNode, that tracks compilation state
	///
	/// @returns  the appened retArr
	function ast_Literal(ast, retArr, funcParam) {
		
		// Reject non numeric literals
		if( isNaN(ast.value) ) {
			throw ast_errorOutput(
				"Non-numeric literal not supported : "+ast.value,
				ast, funcParam
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
	/// @param funcParam    FunctionNode, that tracks compilation state
	///
	/// @returns  the appened retArr
	function ast_BinaryExpression(ast, retArr, funcParam) {
		if (ast.operator == "%") {
			retArr.push("mod(");
			ast_generic(ast.left, retArr, funcParam);
			retArr.push(",");
			ast_generic(ast.right, retArr, funcParam);
			retArr.push(")");
		} else {
			ast_generic(ast.left, retArr, funcParam);
			retArr.push(ast.operator);
			ast_generic(ast.right, retArr, funcParam);
		}

		return retArr;
	}
	
	/// Prases the abstract syntax tree, identifier expression
	///
	/// @param ast          the AST object to parse
	/// @param retArr       return array string
	/// @param funcParam    FunctionNode, that tracks compilation state
	///
	/// @returns  the appened retArr
	function ast_IdentifierExpression(idtNode, retArr, funcParam) {
		if (idtNode.type != "Identifier") {
			throw ast_errorOutput(
				"IdentifierExpression - not an Identifier",
				ast, funcParam
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
			retArr.push(idtNode.name);
		}

		return retArr;
	}
	
	/// Prases the abstract syntax tree, genericially to its respective function
	///
	/// @param ast   the AST object to parse
	///
	/// @returns  the prased openclgl string
	function ast_ForStatement(forNode, retArr, funcParam) {
		if (forNode.type != "ForStatement") {
			throw ast_errorOutput(
				"Invalid for statment",
				ast, funcParam
			);
		}
		retArr.push("for (float ");
		ast_generic(forNode.init, retArr, funcParam);
		retArr.push(";");
		ast_generic(forNode.test, retArr, funcParam);
		retArr.push(";");
		ast_generic(forNode.update, retArr, funcParam);
		retArr.push(")");
		ast_generic(forNode.body, retArr, funcParam);
		return retArr;
	}

	function ast_AssignmentExpression(assNode, retArr, funcParam) {
		if(assNode.operator == "%=") {
			ast_generic(assNode.left, retArr, funcParam);
			retArr.push("=");
			retArr.push("mod(");
			ast_generic(assNode.left, retArr, funcParam);
			retArr.push(",");
			ast_generic(assNode.right, retArr, funcParam);
			retArr.push(")");
		} else {
			ast_generic(assNode.left, retArr, funcParam);
			retArr.push(assNode.operator);
			ast_generic(assNode.right, retArr, funcParam);
			return retArr;
		}
	}

	function ast_EmptyStatement(eNode, retArr, funcParam) {
		retArr.push(";\n");
		return retArr;
	}

	function ast_BlockStatement(bNode, retArr, funcParam) {
		retArr.push("{\n");
		for (var i = 0; i < bNode.body.length; i++) {
			ast_generic(bNode.body[i], retArr, funcParam);
		}
		retArr.push("}\n");
		return retArr;
	}

	function ast_ExpressionStatement(esNode, retArr, funcParam) {
		ast_generic(esNode.expression, retArr, funcParam);
		retArr.push(";\n");
		return retArr;
	}

	function ast_VariableDeclaration(vardecNode, retArr, funcParam) {
		retArr.push("float ");
		for (var i = 0; i < vardecNode.declarations.length; i++) {
			if (i > 0) {
				retArr.push(",");
			}
			ast_generic(vardecNode.declarations[i], retArr, funcParam);
		}
		retArr.push(";");
		return retArr;
	}

	function ast_VariableDeclarator(ivardecNode, retArr, funcParam) {
		
		ast_generic(ivardecNode.id, retArr, funcParam);
		if (ivardecNode.init !== null) {
			retArr.push("=");
			ast_generic(ivardecNode.init, retArr, funcParam);
		}
		return retArr;
	}

	function ast_IfStatement(ifNode, retArr, funcParam) {
		retArr.push("if(");
		ast_generic(ifNode.test, retArr, funcParam);
		retArr.push(")");
		ast_generic(ifNode.consequent, retArr, funcParam);
		retArr.push("else");
		ast_generic(ifNode.alternate, retArr, funcParam);
		return retArr;

	}

	function ast_Break(brNode, retArr, funcParam) {
		retArr.push("break;\n");
		return retArr;
	}

	function ast_Continue(crNode, retArr, funcParam) {
		retArr.push("continue;\n");
		return retArr;
	}

	function ast_LogicalExpression(logNode, retArr, funcParam) {
		ast_generic(logNode.left, retArr, funcParam);
		ast_generic(logNode.operator, retArr, funcParam);
		ast_generic(logNode.right, retArr, funcParam);
		return retArr;
	}

	function ast_UpdateExpression(uNode, retArr, funcParam) {
		if(uNode.prefix) {
			retArr.push(uNode.operator);
			ast_generic(uNode.argument, retArr, funcParam);
		} else {
			ast_generic(uNode.argument, retArr, funcParam);
			retArr.push(uNode.operator);
		}

		return retArr;
	}

	function ast_UnaryExpression(uNode, retArr, funcParam) {
		if(uNode.prefix) {
			retArr.push(uNode.operator);
			ast_generic(uNode.argument, retArr, funcParam);
		} else {
			ast_generic(uNode.argument, retArr, funcParam);
			retArr.push(uNode.operator);
		}

		return retArr;
	}

	function ast_ThisExpression(tNode, retArr, funcParam) {
		retArr.push("this");

		return retArr;
	}

	function ast_MemberExpression(mNode, retArr, funcParam) {
		if(mNode.computed) {
			if (mNode.object.type == "Identifier") {
				retArr.push("get(");
				ast_generic(mNode.object, retArr, funcParam);
				retArr.push(", vec2(");
				ast_generic(mNode.object, retArr, funcParam);
				retArr.push("Size[0],");
				ast_generic(mNode.object, retArr, funcParam);
				retArr.push("Size[1]), vec3(");
				ast_generic(mNode.object, retArr, funcParam);
				retArr.push("Dim[0],");
				ast_generic(mNode.object, retArr, funcParam);
				retArr.push("Dim[1],");
				ast_generic(mNode.object, retArr, funcParam);
				retArr.push("Dim[2]");
				retArr.push("), ");
			} else {
				ast_generic(mNode.object, retArr, funcParam);
				var last = retArr.pop();
				retArr.push(",");
			}
			ast_generic(mNode.property, retArr, funcParam);
			retArr.push(")");
		} else {
			ast_generic(mNode.object, retArr, funcParam);
			retArr.push(".");
			ast_generic(mNode.property, retArr, funcParam);
		}
		return retArr;
	}

	function ast_SequenceExpression(sNode, retArr, funcParam) {
		for (var i = 0; i < sNode.expressions.length; i++) {
			if (i > 0) {
				retArr.push(",");
			}
			ast_generic(sNode.expressions, retArr, funcParam);
		}
		return retArr;
	}
	
	/// Utility function for ast_CallExpression.
	///
	/// Prases the abstract syntax tree, binary expression.
	///
	/// @param ast          the AST object to parse
	///
	/// @returns  {String} the function namespace call, unrolled
	function ast_CallExpression_unroll(ast, funcParam) {
		if( ast.type == "Identifier" ) {
			return ast.name;
		}
		
		if( ast.type == "MemberExpression" ) {
			if( ast.object && ast.property ) {
				return (
					ast_CallExpression_unroll( ast.object, funcParam ) + 
					"." + 
					ast_CallExpression_unroll( ast.property, funcParam )
				);
			}
		}  
		
		// Failure, unknown expression
		throw ast_errorOutput(
			"Unknown CallExpression_unroll",
			ast, funcParam
		);
	}
	
	// The math prefix to use
	var jsMathPrefix = "Math.";
	
	/// Prases the abstract syntax tree, binary expression
	///
	/// @param ast          the AST object to parse
	/// @param retArr       return array string
	/// @param funcParam    FunctionNode, that tracks compilation state
	///
	/// @returns  the appened retArr
	function ast_CallExpression(ast, retArr, funcParam) {
		if( ast.callee ) {
			// Get the full function call, unrolled
			var funcName = ast_CallExpression_unroll(ast.callee);
			
			// Its a math operator, remove the prefix
			if( funcName.indexOf(jsMathPrefix) === 0 ) {
				funcName = funcName.slice( jsMathPrefix.length );
			}
			
			// Register the function into the called registry
			if( funcParam.calledFunctions.indexOf(funcName) < 0 ) {
				funcParam.calledFunctions.push(funcName);
			}
			
			// Call the function
			retArr.push( funcName );
			
			// Open arguments space
			retArr.push( "(" );
			
			// Add the vars
			for(var i=0; i<ast.arguments.length; ++i) {
				if(i > 0) {
					retArr.push(", ");
				}
				ast_generic(ast.arguments[i],retArr,funcParam);
			}
			
			// Close arguments space
			retArr.push( ")" );
			
			return retArr;
		}
		
		// Failure, unknown expression
		throw ast_errorOutput(
			"Unknown CallExpression",
			ast, funcParam
		);
		
		/*
		var mathPrefix = "gpu_math_";
		var mathPrefixLen = mathPrefix.length;
		
		var fName = ast.callee.name || "";
		if( fName.slice(0,mathPrefixLen) == mathPrefix ) {
			var mathSuffix = fName.slice(mathPrefixLen);
			
			retArr.push(mathSuffix);
			retArr.push("(");
			
			if(ast.arguments) {
				var aLen = ast.arguments.length;
				for( var i = 0; i < aLen; ++i ) {
					ast_generic(ast.arguments[i], retArr, funcParam);
					
					if( i+1 < aLen ) {
						retArr.push(", ");
					}
				}
			}
			
			retArr.push(")");
		} 
		*/
		
		
		return retArr;
	}
	
	return functionNode_webgl;
})();
