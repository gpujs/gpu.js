///
/// Class: GPUUtils
///
/// Various utility functions / snippets of code that GPU.JS uses internally.\
/// This covers various snippets of code that is NOT gpu.js specific
///
/// Note that all moethods in this class is "static" by nature `GPUUtils.functionName()`
///
var GPUUtils = (function() {

	var GPUUtils = {};

	// system_endianness closure based memoizer
	var endianness = null;

	///
	/// Function: system_endianness
	///
	/// Gets the system endianness, and cache it
	///
	/// Returns:
	///	{String} "LE" or "BE" depending on system architecture
	///
	/// Credit: https://gist.github.com/TooTallNate/4750953
	function systemEndianness() {
		if( endianness !== null ) {
			return endianness;
		}

		var b = new ArrayBuffer(4);
		var a = new Uint32Array(b);
		var c = new Uint8Array(b);
		a[0] = 0xdeadbeef;
		if (c[0] == 0xef) return endianness = 'LE';
		if (c[0] == 0xde) return endianness = 'BE';
		throw new Error('unknown endianness');
	}
	GPUUtils.systemEndianness = systemEndianness;

	///
	/// Function: isFunction
	///
	/// Return TRUE, on a JS function
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
	GPUUtils.isFunction = isFunction;

	///
	/// Function: isFunctionString
	///
	/// Return TRUE, on a valid JS function string
	///
	/// Note: This does just a VERY simply sanity check. And may give false positives.
	///
	/// Parameters:
	/// 	funcStr - {String}  String of JS function to validate
	///
	/// Returns:
	/// 	{Boolean} TRUE if the string passes basic validation
	///
	function isFunctionString( funcStr ) {
		if( funcStr !== null ) {
			return (funcStr.toString().slice(0, "function".length).toLowerCase() == "function");
		}
		return false;
	}
	GPUUtils.isFunctionString = isFunctionString;

	// FUNCTION_NAME regex
	var FUNCTION_NAME = /function ([^(]*)/;

	///
	/// Function: getFunctionName_fromString
	///
	/// Return the function name from a JS function string
	///
	/// Parameters:
	/// 	funcStr - {String}  String of JS function to validate
	///
	/// Returns:
	/// 	{String} Function name string (if found)
	///
	function getFunctionName_fromString( funcStr ) {
		return FUNCTION_NAME.exec(funcStr)[1];
	}
	GPUUtils.getFunctionName_fromString = getFunctionName_fromString;

	// STRIP COMMENTS regex
	var STRIP_COMMENTS = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg;

	// ARGUMENT NAMES regex
	var ARGUMENT_NAMES = /([^\s,]+)/g;

	///
	/// Function: getParamNames_fromString
	///
	/// Return list of parameter names extracted from the JS function string
	///
	/// Parameters:
	/// 	funcStr - {String}  String of JS function to validate
	///
	/// Returns:
	/// 	{[String, ...]}  Array representing all the parameter names
	///
	function getParamNames_fromString(func) {
		var fnStr = func.toString().replace(STRIP_COMMENTS, '');
		var result = fnStr.slice(fnStr.indexOf('(')+1, fnStr.indexOf(')')).match(ARGUMENT_NAMES);
		if(result === null)
			result = [];
		return result;
	}
	GPUUtils.getParamNames_fromString = getParamNames_fromString;
	
	///
	/// Function: clone
	///
	/// Returns a clone
	///
	/// Parameters:
	/// 	obj - {Object}  Object to clone
	///
	/// Returns:
	/// 	{Object}  Cloned object
	///
	function clone(obj) {
		if(obj === null || typeof(obj) !== 'object' || 'isActiveClone' in obj)
			return obj;

		var temp = obj.constructor(); // changed

		for(var key in obj) {
			if(Object.prototype.hasOwnProperty.call(obj, key)) {
				obj.isActiveClone = null;
				temp[key] = clone(obj[key]);
				delete obj.isActiveClone;
			}
		}

		return temp;
	}
	GPUUtils.clone = clone;

	return GPUUtils;
})();
