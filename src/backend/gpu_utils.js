///
/// Class: gpu_utils
///
/// Various utility functions / snippets of code that GPU.JS uses internally.\
/// This covers various snippets of code that is NOT gpu.js specific
///
/// Note that all moethods in this class is "static" by nature `gpu_utils.functionName()`
///
var gpu_utils = (function() {

	function gpu_utils() {
		throw new Error("This is a utility class - do not construct it");
	}

	// system_endianness closure based memoizer
	var system_endianness_memoizer = null;

	///
	/// Function: system_endianness
	///
	/// Gets the system endianness, and cache it
	///
	/// Returns:
	///	{String} "LE" or "BE" depending on system settings
	///
	/// Credit: https://gist.github.com/TooTallNate/4750953
	function system_endianness() {
		if( system_endianness_memoizer !== null ) {
			return system_endianness_memoizer;
		}

		var b = new ArrayBuffer(4);
		var a = new Uint32Array(b);
		var c = new Uint8Array(b);
		a[0] = 0xdeadbeef;
		if (c[0] == 0xef) return system_endianness_memoizer = 'LE';
		if (c[0] == 0xde) return system_endianness_memoizer = 'BE';
		throw new Error('unknown endianness');
	}
	gpu_utils.system_endianness = system_endianness;

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
	gpu_utils.isFunction = isFunction;

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
	gpu_utils.isFunctionString = isFunctionString;

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
	gpu_utils.getFunctionName_fromString = getFunctionName_fromString;

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
	gpu_utils.getParamNames_fromString = getParamNames_fromString;

	return gpu_utils;
})();
