///
/// Class: functionNode
///
/// [INTERNAL] Represents a single function, inside JS, webGL, or openGL.
///
/// This handles all the raw state, converted state, etc. Of a single function.
///
/// Properties:
/// 	functionName         - {String}        Name of the function
/// 	jsFunction           - {JS Function}   The JS Function the node represents
/// 	jsFunctionString     - {String}        jsFunction.toString()
/// 	paramNames           - {[String,...]}  Parameter names of the function
/// 	paramType            - {[String,...]}  Shader land parameter type assumption
/// 	isRootKernel         - {Boolean}       Special indicator, for kernel function
/// 	webglFunctionString  - {String}        webgl converted function string
/// 	openglFunctionString - {String}        opengl converted function string
/// 	calledFunctions      - {[String,...]}  List of all the functions called
/// 	initVariables        - {[String,...]}  List of variables initialized in the function
/// 	readVariables        - {[String,...]}  List of variables read operations occur
/// 	writeVariables       - {[String,...]}  List of variables write operations occur
///
var functionNode = (function() {
	
	//
	// Constructor
	//----------------------------------------------------------------------------------------------------
	
	///
	/// Function: functionNode
	///
	/// [Constructor] Builds the function with the given JS function, and argument type array.
	///
	/// Parameters:
	/// 	gpu             - {GPU}                   The GPU instance
	/// 	functionName    - {String}                Function name to assume, if its null, it attempts to extract from the function
	/// 	jsFunction      - {JS Function / String}  JS Function to do conversion
	/// 	paramTypeArray  - {[String,...]}          Parameter type array, assumes all parameters are "float" if null
	/// 	returnType      - {String}                The return type, assumes "float" if null
	///
	function functionNode( gpu, functionName, jsFunction, paramTypeArray, returnType ) {
		
		this.gpu = gpu;
		
		//
		// Internal vars setup
		//
		this.calledFunctions  = [];
		this.initVariables    = [];
		this.readVariables    = [];
		this.writeVariables   = [];
		
		//
		// Missing jsFunction object exception
		//
		if( jsFunction == null ) {
			throw "jsFunction, parameter is null";
		}
		
		//
		// Setup jsFunction and its string property + validate them
		//
		this.jsFunctionString = jsFunction.toString();
		if( !validateStringIsFunction(this.jsFunctionString) ) {
			console.error("jsFunction, to string conversion check falied: not a function?", this.jsFunctionString);
			throw "jsFunction, to string conversion check falied: not a function?";
		}
		
		if( !isFunction(jsFunction) ) {
			//throw "jsFunction, is not a valid JS Function";
			this.jsFunction = null;
		} else {
			this.jsFunction = jsFunction;
		}
		
		//
		// Setup the function name property
		//
		this.functionName = functionName || jsFunction.name;
		if( !(this.functionName) ) {
			throw "jsFunction, missing name argument or value";
		}
		
		//
		// Extract parameter name, and its argument types
		//
		this.paramNames = getParamNames(this.jsFunctionString);
		if( paramTypeArray != null ) {
			if( paramTypeArray.length != this.paramNames.length ) {
				throw "Invalid argument type array length, against function length -> ("+
					paramTypeArray.length+","+
					this.paramNames.length+
				")";
			}
			this.paramType = paramTypeArray;
		} else {
			this.paramType = [];
			for(var a=0; a<this.paramNames.length; ++a) {
				this.paramType.push("float");
			}
		}
		
		//
		// Return type handling
		//
		this.returnType = returnType || "float";
	}
	
	//
	// Utility functions
	//----------------------------------------------------------------------------------------------------
	
	///
	/// Function: isFunction
	///
	/// [static] Return TRUE, on a JS function
	///
	/// This is 'static' function, not a class function (functionNode.prototype)
	///
	/// Parameters:
	/// 	funcObj - {JS Function} Object to validate if its a function
	///
	/// Returns:
	/// 	{Boolean} TRUE if the object is a JS function
	///
	function isFunction( funcObj ) {
		return typeof(funcObj) === 'function';
	}
	
	///
	/// Function: validateStringIsFunction
	///
	/// [static] Return TRUE, on a valid JS function string
	///
	/// This is 'static' function, not a class function (functionNode.prototype)
	///
	/// Parameters:
	/// 	funcStr - {String}  String of JS function to validate
	///
	/// Returns:
	/// 	{Boolean} TRUE if the string passes basic validation
	///
	function validateStringIsFunction( funcStr ) {
		if( funcStr !== null ) {
			return (funcStr.slice(0, "function".length).toLowerCase() == "function");
		}
		return false;
	}
	
	var STRIP_COMMENTS = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg;
	var ARGUMENT_NAMES = /([^\s,]+)/g;
	
	///
	/// Function: getParamNames
	///
	/// [static] Return list of parameter names extracted from the JS function string
	///
	/// This is 'static' function, not a class function (functionNode.prototype)
	///
	/// Parameters:
	/// 	funcStr - {String}  String of JS function to validate
	///
	/// Returns:
	/// 	{[String, ...]}  Array representing all the parameter names
	///
	function getParamNames(func) {
		var fnStr = func.toString().replace(STRIP_COMMENTS, '');
		var result = fnStr.slice(fnStr.indexOf('(')+1, fnStr.indexOf(')')).match(ARGUMENT_NAMES);
		if(result === null)
			result = [];
		return result;
	}

	// Passing it to the class object, in case it is needed elsewhere
	// Note, support for this is not guranteed across versions.
	functionNode.isFunction = isFunction;
	functionNode.validateStringIsFunction = validateStringIsFunction;
	functionNode.getParamNames = getParamNames;
	
	//
	// Core function
	//----------------------------------------------------------------------------------------------------
	
	///
	/// Function: getJSFunction
	///
	/// Gets and return the stored JS Function.
	/// Note: that this internally eval the function, if only the string was provided on construction
	///
	/// Returns:
	/// 	{JS Function} The function object 
	///
	function getJSFunction() {
		if( this.jsFunction ) {
			return this.jsFunction;
		}
		
		if( this.jsFunctionString ) {
			this.jsFunction = eval( this.jsFunctionString );
			return this.jsFunction;
		}
		
		throw "Missin jsFunction, and jsFunctionString parameter";
	}
	functionNode.prototype.getJSFunction = getJSFunction;
	
	///
	/// Function: getJS_AST
	///
	/// Parses the class function JS, and returns its Abstract Syntax Tree object.
	///
	/// This is used internally to convert to shader code
	///
	/// Parameters:
	/// 	inParser - {JISON Parser}  Parser to use, assumes in scope "parser" if null
	///
	/// Returns:
	/// 	{AST Object} The function AST Object, note that result is cached under this.jsFunctionAST;
	///
	function getJS_AST( inParser ) {
		if( this.jsFunctionAST ) {
			return this.jsFunctionAST;
		}
		
		inParser = inParser || parser;
		if( inParser == null ) {
			throw "Missing JS to AST parser";
		}
		
		var prasedObj = parser.parse( "var "+this.functionName+" = "+this.jsFunctionString+";" );
		if( prasedObj === null ) {
			throw "Failed to parse JS code via JISON";
		}
			
		// take out the function object, outside the var declarations
		var funcAST = prasedObj.body[0].declarations[0].init;
		this.jsFunctionAST = funcAST;
		
		return funcAST;
	}
	functionNode.prototype.getJS_AST = getJS_AST;
	
	///
	/// Function: getWebglString
	///
	/// Returns the converted webgl shader function equivalent of the JS function
	///
	/// Returns:
	/// 	{String} webgl function string, result is cached under this.webglFunctionString
	///
	function getWebglFunctionString() {
		if( this.webglFunctionString ) {
			return this.webglFunctionString;
		}
		
		return this.webglFunctionString = functionNode_webgl(this);
	}
	functionNode.prototype.getWebglFunctionString = getWebglFunctionString;
	
	///
	/// Function: setWebglString
	///
	/// Set the webglFunctionString value, overwriting it
	///
	/// Parameters:
	/// 	shaderCode - {String}  Shader code string, representing the function
	///
	function setWebglFunctionString(shaderCode) {
		this.webglFunctionString = shaderCode;
	}
	functionNode.prototype.setWebglFunctionString = setWebglFunctionString;
	
	return functionNode;
})();
