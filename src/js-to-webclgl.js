var jsToWebclgl = (function() {
	
	/// Does simple validation of the provided function string if it is a function
	/// this is a basic sanity testing before Jison conversion
	function validateStringIsFunction( funcStr ) {
		if( funcStr != null ) {
			return (funStr.slice(0, "function".length).toLowerCase() == "function")
		}
		return false;;
	}
	
	/// Does the core conversion of a basic Javascript function into a webclgl
	/// and returns a callable function if valid
	///
	/// @param inputFunction to perform the conversion
	///
	/// @returns callable function if converted, else returns null
	function jsToWebclgl( inputFunction ) {
		var funcStr = inputFunction.toString();
		
		if( !validateStringIsFunction(funcStr) ) {
			return null;
		}
		
		
		
		return null;
	}
	
	return jsToWebclgl;
}
