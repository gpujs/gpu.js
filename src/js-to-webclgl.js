var GPU_jsToWebclgl = (function() {
	
	/// Does simple validation of the provided function string if it is a function
	/// this is a basic sanity testing before Jison conversion
	///
	/// @param funcStr  the input function string
	///
	/// @returns boolean
	function validateStringIsFunction( funcStr ) {
		if( funcStr != null ) {
			return (funcStr.slice(0, "function".length).toLowerCase() == "function")
		}
		return false;;
	}
	
	/// Parses the source code string
	///
	/// @param funcStr  the input function string
	///
	/// @returns the parsed json obj
	function jison_parseFuncStr( funcStr ) {
		var mainObj = parser.parse( "var main = "+funcStr+";" );
		if( mainObj == null ) {
			throw "Failed to parse JS code via JISON";
		}
		
		// take out the function object, outside the main var declarations
		return mainObj.body[0].declarations[0].init;
	}
	
	/// Prases the abstract syntax tree, genericially to its respective function
	///
	/// @param ast   the AST object to parse
	/// 
	/// @returns  the prased openclgl string array
	function ast_generic(ast, retArr) {
		switch(ast.type) {
			case "FunctionExpression":
				return ast_FunctionExpression(ast);
		}
		
		throw "Invalid AST";
	}
	
	/// Prases the abstract syntax tree, genericially to its respective function
	///
	/// @param ast   the AST object to parse
	/// 
	/// @returns  the prased openclgl string
	function ast_FunctionExpression(ast, retArr) {
		return retArr;
	}

	/// Prases the abstract syntax tree, genericially to its respective function
	///
	/// @param ast   the AST object to parse
	/// 
	/// @returns  the prased openclgl string
	function ast_ForStatement(forNode, retArr) {
		if (forNode.type != "ForStatement") {
			throw "error";
		}
		retArr.push("for (");
		ast_generic(forNode.init, retArr);
		ast_generic(forNode.test, retArr);
		ast_generic(forNode.update, retArr);
		retArr.push(")");
		ast_generic(forNode.body, retArr);
		return retArr;
	}

	function ast_ExpressionStatement(expNode, retArr) {
		if (expNode.type != "ExpressionStatement") {
			throw "error";
		}
		ast_generic(expNode.expression, retArr);
		retArr.push(";");
		return retArr;
	}

	function ast_AssignmentExpression(assNode, retArr) {
		if (assNode.type != "AssignmentExpression") {
			throw "error";
		}

		retArr.push("float");
		ast_generic(assNode.left, retArr);
		retArr.push(assNode.operator);
		ast_generic(assNode.right, retArr);
	}
	
	/// Does the core conversion of a basic Javascript function into a webclgl
	/// and returns a callable function if valid
	///
	/// @param inputFunction   The calling to perform the conversion
	/// @param _threadDim      The thread dim array configuration
	/// @param _blockDim       The block dim array configuration
	/// @param paramObj        The parameter object
	///
	/// @returns callable function if converted, else returns null
	function jsToWebclgl( inputFunction, _threadDim, _blockDim ) {
		var funcStr = inputFunction.toString();
		
		if( !validateStringIsFunction(funcStr) ) {
			return null;
		}
		
		var astOutputObj = jison_parseFuncStr(funcStr);
		var openclglStrArr = ast_generic(ast, []);
		
		return openclglStrArr.join(" ");
	}
	
	return jsToWebclgl;
})();
