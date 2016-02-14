///
/// @class functionNode
///
/// Represents a single function, inside JS, webGL, or openGL.
/// This handles the raw state, converted state, etc.
///
/// # JS Related properties 
///
/// @property  {JS Function}   jsFunction            The JS Function the node represents
/// @property  {String}        jsFunctionString      jsFunction.toString()
/// @property  {[String,...]}  paramNames            Parameter names of the function
/// @property  {[String,...]}  paramType             Shader land parameter type assumption
/// @property  {Boolean}       isRootKernal          Special indicator, for kernal function
///
/// # Webgl related properties
///
/// @property  {String}        webglFunctionString   webgl converted function string
///
/// # Code analysis properties (after converting to webgl)
///
/// @property  {[String,...]}  calledFunctions       List of all the functions called
/// @property  {[String,...]}  initVariables         List of variables initialized in the function
/// @property  {[String,...]}  readVariables         List of variables read operations occur
/// @property  {[String,...]}  writeVariables        List of variables write operations occur
///
var functionNode = (function() {
	
	//
	// Constructor
	//----------------------------------------------------------------------------------------------------
	
	///
	/// @function functionNode
	///
	/// [Constructor] Builds the function with the given JS function, and argument type array. 
	/// If argument types are not provided, they are assumed to be "float*"
	///
	/// @param  {String}        Function name to assume, if its null, it attempts to extract from the function
	/// @param  {JS Function}   JS Function to do conversion   
	/// @param  {[String,...]}  Parameter type array, assumes "float" if not given
	/// @param  {String}        The return type, assumes float
	///
	function functionNode( functionName, jsFunction, paramTypeArray, returnType ) {
		
		//
		// Internal vars setup
		//
		this.calledFunctions  = [];
		this.initVariables    = [];
		this.readVariables    = [];
		this.writeVariables   = [];
		
		//
		// Setup jsFunction and its string property + validate them
		//
		this.jsFunction = jsFunction;
		if( !isFunction(this.jsFunction) ) {
			throw "jsFunction, is not a valid JS Function";
		}
		
		this.jsFunctionString = jsFunction.toString();
		if( !validateStringIsFunction(this.jsFunctionString) ) {
			throw "jsFunction, to string conversion falied";
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
	/// @function isFunction
	///
	/// @param {JS Function}  Object to validate if its a function
	///
	/// @return {Boolean}  TRUE if the object is a JS function
	///
	function isFunction( funcObj ) {
		return typeof(funcObj) === 'function';
	}
	
	///
	/// @function validateStringIsFunction
	///
	/// @param {String}  String of JS function to validate
	///
	/// @return {Boolean}  TRUE if the string passes basic validation
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
	/// @function getParamNames
	///
	/// @param {String}  String of JS function to extract parameter names
	/// 
	/// @return {[String, ...]}  Array representing all the parameter names
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
	functionNode._isFunction = isFunction;
	functionNode._validateStringIsFunction = validateStringIsFunction;
	functionNode._getParamNames = getParamNames;
	
	//
	// Core function
	//----------------------------------------------------------------------------------------------------
	
	///
	/// @function functionNode.getJS_AST
	///
	/// @param {JISON Parser}  Parser to use, assumes in scope "parser" if null
	/// 
	/// @return {AST Object}   The function AST Object, note that result is cached under this.jsFunctionAST;
	///
	functionNode.prototype.getJS_AST = function getJS_AST( inParser ) {
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
	
	///
	/// @function functionNode.getWebglString
	/// 
	/// @return {String}  webgl function string, result is cached under this.webglFunctionString
	///
	functionNode.prototype.getWebglFunctionString = function getWebglFunctionString() {
		if( this.webglFunctionString ) {
			return this.webglFunctionString;
		}
		
		return this.webglFunctionString = functionNode_webgl(this);
	}
	
	return functionNode;
})();
