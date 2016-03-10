///
/// Class: GPU
///
/// Initialises the GPU.js library class which manages the WebGL context for the created functions.
///
var GPU = (function() {
	var GPU = gpu_core;
	
	GPU.prototype.getGl = function() {
		return this.gl;
	};

	GPU.prototype.getCanvas = function(mode) {
		if (mode == "cpu") {
			return this.canvasCpu;
		}

		return this.canvas;
	};

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
		return GPUUtils.browserSupport_webgl();
	}
	GPU.prototype.support_webgl = support_webgl;
	
	return GPU;
})();
