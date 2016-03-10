///
/// Class: GPU
///
/// Initialises the GPU.js library class which manages the WebGL context for the created functions.
///
var GPU = (function() {
	var GPU = gpu_core;
	
	///
	/// Function: support_webgl
	///
	/// Return TRUE, if browser supports webgl AND canvas
	///
	/// Note: This function can also be called directly `GPU.support_webgl()`
	///
	/// Returns:
	/// 	{Boolean} TRUE if browser supports webgl
	///
	function support_webgl() {
		return gpu_utils.browserSupport_webgl();
	}
	GPU.prototype.support_webgl = support_webgl;
	
	return GPU;
})();
