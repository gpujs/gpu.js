/// The core GPU.js function
///
/// The parameter object contains the following sub parameters
/// 
/// + thread (default: [1024])
/// + block  (default: [1]) 
/// + mode   (default: null)
///
/// @param inputFunction   The calling to perform the conversion
/// @param paramObj        The parameter configuration object
///
/// @returns callable function to run
var GPU = function(kernal, paramObj) {
	
	//
	// basic parameters safety checks
	//
	if( kernal == null ) {
		throw "Missing kernal parameter";
	}
	if( {}.toString.call(kernal) !== '[object Function]' ) {
		throw "kernal parameter not a function";
	}
	if( paramObj == null ) {
		paramObj = {};
	}
	
	//
	// Get the thread and block config, fallbacks to default value if not set
	//
	var thread = paramObj.thread || [1024];
	var block  = paramObj.block  || [1];
	
	//
	// Attempts to do the webclgl conversion, returns if success
	//
	var ret = GPU_jsToWebclgl(kernal, thread, block, paramObj);
	if(ret != null) {
		return ret;
	}
	
	//
	// Fallback to pure native JS 
	//
	return GPU_jsFallback(kernal, thread, block, paramObj);
}
