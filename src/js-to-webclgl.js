var GPU_jsStrToWebclglStr = (function() {
	
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
	
	/// the AST error, with its location. To throw (@TODO add location support)
	///
	/// @param error   the error message output
	/// @param ast     the AST object where the error is
	/// @param srcArr  the source code array (for better error tracing)
	function ast_errorOutput(error, ast, srcArr) {
		return error;
	}
	
	/// Prases the abstract syntax tree, genericially to its respective function
	///
	/// @param ast   the AST object to parse
	/// 
	/// @returns  the prased openclgl string array
	function ast_generic(ast, retArr, paramObj) {
		switch(ast.type) {
			case "FunctionExpression":
				return ast_FunctionExpression(ast, retArr, paramObj);
		}
		
		throw ast_errorOutput("Unknown ast type : "+ast.type);
	}
	
	/// Prases the abstract syntax tree, genericially to its respective function
	///
	/// @param ast   the AST object to parse
	/// 
	/// @returns  the prased openclgl string
	function ast_FunctionExpression(ast, retArr, paramObj) {
		console.log(arguments);
		return retArr;
	}
	
	/// The function string to 
	/// 
	/// 
	function jsStrToWebclglStr( funcStr, _threadDim, _blockDim, paramObj ) {
		var funcStrLines = funcStr.split("\n");
		var astOutputObj = jison_parseFuncStr(funcStr);
		
		var retArr = ast_generic(astOutputObj, [], paramObj);
		return retArr.join(" ");
	}
	
	return jsStrToWebclglStr;
})();

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
	
	/// Does the core conversion of a basic Javascript function into a webclgl
	/// and returns a callable function if valid
	///
	/// @param inputFunction   The calling to perform the conversion
	/// @param _threadDim      The thread dim array configuration
	/// @param _blockDim       The block dim array configuration
	/// @param paramObj        The parameter object
	///
	/// @returns callable function if converted, else returns null
	function jsToWebclgl( inputFunction, _threadDim, _blockDim, paramObj ) {
		var funcStr = inputFunction.toString();
		
		if( !validateStringIsFunction(funcStr) ) {
			return null;
		}
		
		var webclglStr = GPU_jsStrToWebclglStr( funcStr, _threadDim, _blockDim, paramObj );
		
		return null;
	}
	
	return jsToWebclgl;
})();
