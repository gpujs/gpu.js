var GPU_jsStrToWebclglStr = (function() {
	/// @returns always a literal float
	function ensureFloat(f) {
		if( Number.isInteger(f) ) {
			return f + ".0";
		}
		return f;
	}
	
	/// @returns  the default state paramater set, used across the parser
	function jison_defaultStateParam(funcStr, inParamObj, inArgStateObj) {
		return {
			// The source code rows array
			src : funcStr,
			srcArr : funcStr.split("\n"),
			
			// The compiler parameter options
			paramObj : inParamObj,
			
			// The argument state object
			argStateObj : inArgStateObj,
			
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
	function ast_generic(ast, retArr, stateParam ) {
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
	function ast_FunctionExpression(ast, retArr, stateParam, argStateObj) {
		
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
		
		// Handle parameters tokens
		var paramsNode = ast.params;
		if(paramsNode) {
			for(var i=0; i<paramsNode.length; ++i) {
				if( paramsNode[i].type != "Identifier" ) {
					throw ast_errorOutput(
						"Unexpected function parameter identifier"+paramsNode[i].type,
						paramsNode[i], stateParam
					);
				}
				
				retArr.push(" float* ");
				retArr.push(paramsNode[i].name);
				
				if(i+1 < paramsNode.length) {
					retArr.push(", ");
				}
			}
		}
		
		// Function opening bracket
		retArr.push(") { ");
		
		// Argument state obj main prefix injection
		if( argStateObj && argStateObj.mainBodyPrefix && ast.id == "main" ) {
			retArr.push(mainBodyPrefix);
			retArr.push(" ");
		}
		
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
			retArr.push("; ");
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
		if(
			ast.operator == "+" ||
			ast.operator == "-" ||
			ast.operator == "*" ||
			ast.operator == "/"
		) {
			ast_generic(ast.left, retArr, stateParam);
			retArr.push( " "+ast.operator+" " );
			ast_generic(ast.right, retArr, stateParam);
		} else if(ast.operator == "%") {
			ast_generic(ast.left, retArr, stateParam);
			retArr.push( " , " );
			ast_generic(ast.right, retArr, stateParam);
			retArr.push( ")" );
		} else {
			throw ast_errorOutput("Unsupported BinaryExpression: "+ast.operator, ast, stateParam);
		}
		
		return retArr;
	}

	/// Prases the abstract syntax tree, member expression
	///
	/// @param ast          the AST object to parse
	/// @param retArr       return array string
	/// @param stateParam   the compiled state tracking
	///
	/// @returns  the appened retArr
	function ast_MemberExpression(ast, retArr, stateParam) {
		
		// Name identifier support
		/*if( ast.object && ast.object.type == "Identifier" && ast.object.name ) {
			retArr.push( ast.object.name );
			retArr.push("[");
			ast_generic(ast.property, retArr, stateParam);
			retArr.push("]");
		}*/
		
		retArr.push( ast.name || ast.object.name );
		retArr.push("[");
		ast_generic(ast.property, retArr, stateParam);
		retArr.push("]");
		
		// @TODO: FIXME
		return retArr;
		
		throw ast_errorOutput("Unsupported MemberExpression: "+ast.name+"["+ast.property+"]", ast, stateParam);
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
		retArr.push(";");
		ast_generic(forNode.test, retArr);
		retArr.push(";");
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

		ast_generic(assNode.left, retArr);
		retArr.push(assNode.operator);
		ast_generic(assNode.right, retArr);
	}
	
	function ast_VariableDeclarator(vdNode, retArr) {
		
	}

	function ast_IdentifierExpression(idtNode, retArr) {
		if (idtNode.type != "Identifier") {
			throw "error";
		}

		retArr.push(idtNode.name);
	}
	
	/// Boiler plate code generation
	function generateBoilerCode( funcStr, _threadDim, _blockDim, paramObj, argStateObj ) {
		var boilerplate = "";
		boilerplate += "float _threadDimX_ = " + ensureFloat(argStateObj.threadDimX) +";\n";
		boilerplate += "float _threadDimY_ = " + ensureFloat(argStateObj.threadDimY) +";\n";
		boilerplate += "float _threadDimZ_ = " + ensureFloat(argStateObj.threadDimZ) +";\n";
		boilerplate += "vec2 _vecId_ = get_global_id();\n";
		boilerplate += "float _id_ = (_vecId_.x * " +
			ensureFloat(argStateObj.result_w) + ") + " +
			ensureFloat(argStateObj.result_w) + " * (_vecId_.y * " +
			ensureFloat(argStateObj.result_h) + ");\n";
		boilerplate += "_threadZ_ = round(_id_ / (_threadDimX_ * _threadDimY_));\n";
		boilerplate += "_threadY_ = round((_id_ - _threadZ_ * _threadDimY_) / _threadDimX_);\n";
		boilerplate += "_threadX_ = _id_ - _threadDimX_ * (_threadY_ + _threadDimY_ * _threadZ_);\n";
		return boilerplate;
	}
	
	/// The function string to openslgl code generator
	function jsStrToWebclglStr( funcStr, _threadDim, _blockDim, paramObj, argStateObj ) {
		
		var stateObj = jison_defaultStateParam(funcStr, paramObj, argStateObj);
		var astOutputObj = jison_parseFuncStr(funcStr, stateObj);
		var retArr = [];
		
		// Boiler plate code, only if argStateObj is passed
		if( argStateObj != null ) {
			argStateObj.mainBodyPrefix = generateBoilerCode( funcStr, _threadDim, _blockDim, paramObj, argStateObj );
		}
		
		ast_generic( astOutputObj, retArr, stateObj, argStateObj );
		return retArr.join("");
	}
	
	return jsStrToWebclglStr;
})();

var GPU_jsToWebclgl = (function() {
	
	///----------------------------------------------------------------------------------------
	/// Misc utility functions, copy pasta from somewhere >_>
	///----------------------------------------------------------------------------------------
	var STRIP_COMMENTS = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg;
	var ARGUMENT_NAMES = /([^\s,]+)/g;
	function getParamNames(func) {
		var fnStr = func.toString().replace(STRIP_COMMENTS, '');
		var result = fnStr.slice(fnStr.indexOf('(')+1, fnStr.indexOf(')')).match(ARGUMENT_NAMES);
		if(result === null)
			result = [];
		return result;
	}
	
	///----------------------------------------------------------------------------------------
	/// Actual SHIT
	///----------------------------------------------------------------------------------------
	
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
		
		//
		// Webclgl String generation and basic checks
		//--------------------------------------------
		
		//
		// Function stringify, and basic validation
		//
		var funcStr = inputFunction.toString();
		if( !validateStringIsFunction(funcStr) ) {
			return null;
		}
		
		//
		// Precalculating some of the vars
		//--------------------------------------------
		
		//
		// Fetching arguments name
		//
		var argNames = getParamNames(inputFunction);
		
		//
		// Normalizing threadDim & blockDim
		//
		var threadDim = _threadDim.slice(0);
		var blockDim  = _blockDim.slice(0);
		while (threadDim.length < 3) {
			threadDim.push(1);
		}
		while (blockDim.length < 3) {
			blockDim.push(1);
		}
		
		//
		// Global dim, and total size
		//
		var globalDim = [
			threadDim[0] * blockDim[0],
			threadDim[1] * blockDim[1],
			threadDim[2] * blockDim[2]
		];
		var totalSize = globalDim[0] * globalDim[1] * globalDim[2];
		
		//
		// Return function caller
		//--------------------------------------------
		var retFunc = function webclglCaller() {
			
			//
			// Argument safety check
			//----------------------------------
			if(argNames.length != arguments.length) {
				throw "Invalid argument count ("+arguments.length+") expected ("+argNames.length+")";
			}
			
			//
			// String conversion and exec
			//----------------------------------
			
			//
			// webclgl core class setup
			// @TODO: Consider precreating the object as optimization?, check if this crashses shit
			//
			var webCLGL = new WebCLGL();
			
			//
			// Float offset and result buffer setup
			//
			var floatOffset = paramObj.floatOffset || 65535.0;
			var resultBuffer = webCLGL.createBuffer(totalSize, "FLOAT", floatOffset);
			
			//
			// Argument State obj init
			//----------------------------------
			var argStateObj = {};
			argStateObj.result_w = resultBuffer.W;
			argStateObj.result_h = resultBuffer.H;
			argStateObj.threadDimX = threadDim[0];
			argStateObj.threadDimY = threadDim[1];
			argStateObj.threadDimZ = threadDim[2];
			
			//
			// Argument buffer handling
			//
			var argBuffers = [];
			for (var i=0; i<argNames.length; i++) {
				argBuffers[i] = webCLGL.createBuffer(arguments[i].length, "FLOAT", floatOffset);
				webCLGL.enqueueWriteBuffer(argBuffers[i], arguments[i]);
			}
			
			//
			// EVIL, like EVAL is EVIL, function string replacement
			// @TODO: Banish this EVIL
			// @TODO: Remove replaceAll
			//
			String.prototype.replaceAll = String.prototype.replaceAll || function (find, replace) {
				var str = this;
				return str.replace(new RegExp(find, 'g'), replace);
			};
			funcStr = funcStr.replaceAll('this.thread.x', '_threadX_');
			funcStr = funcStr.replaceAll('this.thread.y', '_threadY_');
			funcStr = funcStr.replaceAll('this.thread.z', '_threadZ_');
			funcStr = funcStr.replaceAll('Math.', '_math_');
			
			//
			// Compile the kernal code, from JS, to webclgl, to Shader (via unknown vodoo)
			// @TODO: Consider precreating the object as optimization?, check if this crashses shit
			//
			var webclglStr = GPU_jsStrToWebclglStr( funcStr, _threadDim, _blockDim, paramObj, argStateObj );
			var kernel = webCLGL.createKernel(webclglStr);
			
			//
			// Link up the argument and result buffer
			//
			for (var i=0; i<argNames.length; i++) {
				kernel.setKernelArg(i, argBuffers[i]);
			}
			
			// Does not need the kernel.compile optimiztion, as code is recompiled on each run
			// @TODO: consider this ??
			//kernel.compile();
			
			webCLGL.enqueueNDRangeKernel(kernel, resultBuffer);
			
			//
			// Fetch the result
			// @TODO : Async support????
			//
			var result = webCLGL.enqueueReadBuffer_Float(resultBuffer);
			result = Array.prototype.slice.call(result[0]);
			
			if (_threadDim.length == 1) {
				return result[0];
			} else if (_threadDim.length == 2) {
				//ret = ret[0];
			}
			
			return result;
		};
		
		//
		// async extension ???
		//
		//retFunc.async()???
		
		return retFunc;
	}
	
	return jsToWebclgl;
})();
