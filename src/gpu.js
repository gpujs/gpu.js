GPU = (function() {
	var gl, canvas;
	
	function GPU(ctx) {
		canvas = undefined;
		gl = ctx;
		if (gl === undefined) {
			canvas = document.createElement('canvas');
			canvas.width = 2;
			canvas.height = 2;
			var glOpt = {
		        depth: false,
				antialias: false
		    };

			gl = canvas.getContext("experimental-webgl", glOpt) || canvas.getContext("webgl", glOpt);
		}
		
		gl.getExtension('OES_texture_float');
		gl.getExtension('OES_texture_float_linear');
		gl.getExtension('OES_element_index_uint');
		
		this.gl = gl;
		this.canvas = canvas;
		this.programCache = {};
	}
	
	GPU.prototype.getGl = function() {
		return this.gl;
	};
	
	GPU.prototype.getCanvas = function() {
		return this.canvas;
	};

	/// The core GPU.js function
	///
	/// The parameter object contains the following sub parameters
	///
	/// +---------------+---------------+---------------------------------------------------------------------------+
	/// | Name          | Default value | Description                                                               |
	/// +---------------+---------------+---------------------------------------------------------------------------+
	/// | dimensions    | [1024]        | Thread dimension array                                                    |
	/// | mode          | null          | CPU / GPU configuration mode, "auto" / null. Has the following modes.     |
	/// |               |               |     + null / "auto" : Attempts to build GPU mode, else fallbacks          |
	/// |               |               |     + "gpu" : Attempts to build GPU mode, else fallbacks                  |
	/// |               |               |     + "cpu" : Forces JS fallback mode only                                |
	/// +---------------+---------------+---------------------------------------------------------------------------+
	///
	/// @param inputFunction   The calling to perform the conversion
	/// @param paramObj        The parameter configuration object
	///
	/// @returns callable function to run
	GPU.prototype.createKernel = function(kernel, paramObj) {
		
		//
		// basic parameters safety checks
		//
		if( kernel === undefined ) {
			throw "Missing kernel parameter";
		}
		if( !(kernel instanceof Function) ) {
			throw "kernel parameter not a function";
		}
		if( paramObj === undefined ) {
			paramObj = {};
		}
		
		//
		// Get theconfig, fallbacks to default value if not set
		//
		paramObj.dimensions = paramObj.dimensions || [1];
		mode = paramObj.mode && paramObj.mode.toLowerCase();
		
		//
		// Attempts to do the glsl conversion, returns if success
		//
		var ret = null;
		
		if( mode === undefined || mode === "gpu" || mode === "auto" ) {
			// Attempts to do the conversion to glsl
			if( (ret = this._backendGLSL(kernel, paramObj)) !== null) {
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
		return this._backendFallback(kernel, paramObj);
	};

	return GPU;
})();
