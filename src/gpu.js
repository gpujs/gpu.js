/// The core GPU.js function
///
/// The parameter object contains the following sub parameters
/// 
/// +---------------+---------------+---------------------------------------------------------------------------+
/// | Name          | Default value | Description                                                               |
/// +---------------+---------------+---------------------------------------------------------------------------+
/// | thread        | [1024]        | Thread dimension array                                                    |
/// | block         | [1]           | Block dimension array                                                     |
/// | mode          | null          | CPU / GPU configuration mode, "auto" / null. Has the following modes.     |
/// |               |               |     + null / "auto" : Attempts to build GPU mode, else fallbacks          |
/// |               |               |     + "gpu" : Attempts to build GPU mode, else fallbacks                  |
/// |               |               |     + "cpu" : Forces JS fallback mode only                                |
/// | floatOffset   | 65535         | Float values offset range                                                 |
/// +---------------+---------------+---------------------------------------------------------------------------+
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
	var mode   = paramObj.mode   && paramObj.mode.toLowerCase();
	
	//
	// Attempts to do the webclgl conversion, returns if success
	//
	var ret = null;
	
	if( mode == null || mode == "gpu" ) {
		// Attempts to do the conversion to webclgl
		if( (ret = GPU_jsToWebclgl(kernal, thread, block, paramObj)) != null) {
			return ret;
		}
		
		// GPU only mode failed, return null
		if( mode == "gpu" ) {
			return null;
		}
	}
	
	//
	// Fallback to pure native JS 
	//
	return GPU_jsFallback(kernal, thread, block, paramObj);
};

GPU._jsStrToWebclglStr = GPU_jsStrToWebclglStr;
