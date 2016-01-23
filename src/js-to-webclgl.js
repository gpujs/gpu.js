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
	function jsToWebclgl( inputFunction, _threadDim, _blockDim ) {
		var funcStr = inputFunction.toString();
		
		if( !validateStringIsFunction(funcStr) ) {
			return null;
		}
		
		
		
		return null;
	}
	
	return jsToWebclgl;
})();
