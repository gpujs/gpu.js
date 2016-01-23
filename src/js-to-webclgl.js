var GPU_jsStrToWebclglStr = (function() {
	
	/// @returns  the default state paramater set, used across the parser
	function jison_defaultStateParam(funcStr, inParamObj) {
		return {
			// The source code rows array
			src : funcStr,
			srcArr : funcStr.split("\n"),
			
			// The compiler parameter options
			paramObj : inParamObj,
			
			// Original main function naming
			customMainFunctionName : null,
			
			// Reserved namespace used for GPU.js code
			reservedNamespace : "gpu_",
			
			// Current function state, being processed
			currentFunctionNamespace : null,
			
			// Annoymous function number tracking
			annoymousFunctionNumber : 0
		};
	}
	
	/// Parses the source code string
	///
	/// @param  funcStr      the input function string
	/// @param  stateParam   the compiled state tracking
	///
	/// @returns the parsed json obj
	function jison_parseFuncStr( funcStr, stateParam ) {
		var mainObj = parser.parse( "var main = "+funcStr+";" );
		if( mainObj == null ) {
			throw "Failed to parse JS code via JISON";
		}
		
		// take out the function object, outside the main var declarations
		var mainAst = mainObj.body[0].declarations[0].init;
		
		// Capture the original statment code
		stateParam.customMainFunctionName = mainAst.id;
		mainAst.id = "main";
		
		return mainAst;
	}
	
	/// the AST error, with its location. To throw (@TODO add location support)
	///
	/// @param error        the error message output
	/// @param ast          the AST object where the error is
	/// @param stateParam   the compiled state tracking
	function ast_errorOutput(error, ast, stateParam) {
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
		switch(ast.type) {
			case "FunctionExpression":
				return ast_FunctionExpression(ast, retArr, stateParam);
			case "ReturnStatement":
				return ast_ReturnStatement(ast, retArr, stateParam);
			case "Literal":
				return ast_Literal(ast, retArr,  stateParam);
		}
		
		throw ast_errorOutput("Unknown ast type : "+ast.type, ast, stateParam);
	}
	
	/// Prases the abstract syntax tree, to its named function
	///
	/// @param ast   the AST object to parse
	/// @param retArr       return array string
	/// @param stateParam   the compiled state tracking
	/// 
	/// @returns  the appened retArr
	function ast_FunctionExpression(ast, retArr, stateParam) {
		
		// Setup the main function
		if( ast.id == "main" ) {
			retArr.push("void main(");
		} else {
			// @TODO : Suuport return type values
			retArr.push("void ");
			
			// Its an Annoymous function, handle it
			if(ast.id == null) {
				ast.id = stateParam.reservedNamespace+"a"+stateParam.annoymousFunctionNumber;
				stateParam.annoymousFunctionNumber++;
			}
			
			//Function name
			retArr.push(ast.id);
			retArr.push("(");
		}
		stateParam.currentFunctionNamespace = ast.id;
		
		// @TODO : Handle parameters tokens
		// retArr.push(float* a, float* b)
		
		// Function opening bracket
		retArr.push(") { ");
		
		// Body statement iteration
		for(var i=0; i<ast.body.length; ++i) {
			ast_generic(ast.body[i], retArr, stateParam);
		}
		
		// Function closing
		retArr.push("}");
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
			retArr.push("out_float = ");
			ast_generic(ast.argument, retArr, stateParam);
			retArr.push("; return; ");
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
	
	/*
	
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
	*/
	
	/// The function string to openslgl code generator
	function jsStrToWebclglStr( funcStr, _threadDim, _blockDim, paramObj ) {
		
		var stateObj = jison_defaultStateParam(funcStr, paramObj);
		var astOutputObj = jison_parseFuncStr(funcStr, stateObj);
		
		var retArr = ast_generic( astOutputObj, [], stateObj );
		return retArr.join("");
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
