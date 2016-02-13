///
/// @class functionNode
///
/// Represents a single function, inside JS, webGL, or openGL.
/// This handles the raw state, converted state, etc.
///
var functionNode = (function() {
	
	///
	/// @function: functionNode
	///
	/// [Constructor] Builds the function with the given JS function, and argument type array. 
	/// If argument types are not provided, they are assumed to be "float*"
	///
	/// @param  {JS Function}   JS Function to do conversion   
	/// @param  {[string,...]}  Parameter type array, assumes "float*" if not given
	///
	function functionNode( jsFunction, argumentTypeArray ) {
		this.jsFunction = jsFunction;
		this.jsFunctionString = jsFunction.toString();
	}
	
	///
	///
	///
	function validateStringIsFunction( funcStr ) {
		if( funcStr !== null ) {
			return (funcStr.slice(0, "function".length).toLowerCase() == "function");
		}
		return false;
	}
	
	
	
	var STRIP_COMMENTS = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg;
	var ARGUMENT_NAMES = /([^\s,]+)/g;
	function getParamNames(func) {
		var fnStr = func.toString().replace(STRIP_COMMENTS, '');
		var result = fnStr.slice(fnStr.indexOf('(')+1, fnStr.indexOf(')')).match(ARGUMENT_NAMES);
		if(result === null)
			result = [];
		return result;
	}


	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	//functionBuilder.prototype.
	
	return functionNode;
})();
