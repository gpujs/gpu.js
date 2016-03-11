///
/// Class: GPUCore
///
/// Represents the "private/protected" namespace of the GPU class
///
/// *GPUCore.js* internal functions namespace
/// *gpu.js* PUBLIC function namespace
///
/// I know @private makes more sense, but since the documentation engine state is undetirmined.
/// (See https://github.com/gpujs/gpu.js/issues/19 regarding documentation engine issue)
/// File isolation is currently the best way to go
///
var GPUCore = (function() {

	function GPUCore() {
		var gl, canvas;

		canvas = undefined;
		if (gl === undefined) {
			canvas = GPUUtils.init_canvas();
			gl = GPUUtils.init_webgl(canvas);
		}

		this.webgl = gl;
		this.canvas = canvas;
		this.programCache = {};
		this.endianness = GPUUtils.systemEndianness();

		this.functionBuilder = new functionBuilder(this);
		this.functionBuilder.polyfillStandardFunctions();
	}
	
	// Legacy method to get webgl : Preseved for backwards compatibility
	GPUCore.prototype.getGl = function() {
		return this.webgl;
	};

	GPUCore.prototype.textureToArray = function(texture) {
		var copy = this.createKernel(function(x) {
			return x[this.thread.z][this.thread.y][this.thread.x];
		});

		return copy(texture);
	};

	return GPUCore;
})();
