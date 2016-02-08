GPU = (function() {
	var gl, canvas;
	
	function GPU(ctx) {
		canvas = undefined;
		gl = ctx;
		if (gl === undefined) {
			canvas = document.createElement('canvas');
			canvas.width = 2;
			canvas.height = 2;
			gl = canvas.getContext("experimental-webgl", {
		        depth: false,
				antialias: false
		    });
		}
		
		gl.getExtension('OES_texture_float');
		gl.getExtension('OES_texture_float_linear');
		gl.getExtension('OES_element_index_uint');
		
		this.gl = gl;
		this.canvas = canvas;
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
	GPU.prototype.createKernel = function(kernel, paramObj) {
		
		//
		// basic parameters safety checks
		//
		if( kernel === null ) {
			throw "Missing kernel parameter";
		}
		if( {}.toString.call(kernel) !== '[object Function]' ) {
			throw "kernel parameter not a function";
		}
		if( paramObj === null ) {
			paramObj = {};
		}
		
		//
		// Get the thread and block config, fallbacks to default value if not set
		//
		paramObj.dimensions = paramObj.dimensions || [1024];
		mode = paramObj.mode && paramObj.mode.toLowerCase();
		
		//
		// Attempts to do the webclgl conversion, returns if success
		//
		var ret = null;
		
		if( mode === null || mode === "gpu" || mode === "auto" ) {
			// Attempts to do the conversion to webclgl
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
