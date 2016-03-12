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
	
	///
	/// Get and returns the Synchronous executor, of a class and kernel
	/// Which returns the result directly after passing the arguments.
	///
	function getSynchronousModeExecutor() {
		var kernel = this._kernelFunction;
		var paramObj = this._kernelParamObj;
		paramObj.dimensions = paramObj.dimensions || [];
		
		var mode = this.computeMode;
		
		//
		// CPU mode
		//
		if ( mode == "cpu" ) {
			return this._mode_cpu(kernel, paramObj);
		}

		//
		// Attempts to do the glsl conversion
		//
		try {
			return this._mode_gpu(kernel, paramObj);
		} catch (e) {
			if ( mode != "gpu") {
				console.warning("Falling back to CPU!");
				this.computeMode = mode = "cpu";
				return this._mode_cpu(kernel, paramObj);
			} else {
				throw e;
			}
		}
	}
	GPUCore.prototype.getSynchronousModeExecutor = getSynchronousModeExecutor;
	
	///
	/// Get and returns the ASYNCRONUS executor, of a class and kernel
	/// This returns a Promise object from an argument set.
	///
	/// Note that there is no current implmentation.
	///
	function getPromiseModeExecutor() {
		return null;
	}
	GPUCore.prototype.getPromiseModeExecutor = getPromiseModeExecutor;
	
	return GPUCore;
})();
