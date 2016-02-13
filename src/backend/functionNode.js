///
/// @class functionNode
///
/// Represents a single function, inside JS, webGL, or openGL.
/// This handles the raw state, converted state, etc.
///
/// @property  {JS Function}   jsFunction         The JS Function the node represents
/// @property  {String}        jsFunctionString   jsFunction.toString()
/// @property  {[String,...]}  paramNames         Parameter names of the function
/// @property  {[String,...]}  paramType          Shader land parameter type assumption
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
	/// @param  {[String,...]}  Parameter type array, assumes "float*" if not given
	///
	function functionNode( functionName, jsFunction, paramTypeArray ) {
		
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
		this.paramNames = getParamNames(this.jsFunctionString);
		
		//
		// Setup the function name property
		//
		this.functionName = functionName || jsFunction.name;
		
		//
		// Extract parameter name, and its argument types
		//
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

	// Passing it to the prototype node, in case it is needed elsewhere
	// Note, support for this is not guranteed across versions.
	functionNode.prototype._isFunction = isFunction;
	functionNode.prototype._validateStringIsFunction = validateStringIsFunction;
	functionNode.prototype._getParamNames = getParamNames;
	
	
	return functionNode;
})();
