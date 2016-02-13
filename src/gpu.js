GPU = (function() {
	var gl, canvas;
	
	// https://gist.github.com/TooTallNate/4750953
	function endianness() {
		var b = new ArrayBuffer(4);
		var a = new Uint32Array(b);
		var c = new Uint8Array(b);
		a[0] = 0xdeadbeef;
		if (c[0] == 0xef) return 'LE';
		if (c[0] == 0xde) return 'BE';
		throw new Error('unknown endianness');
	}
	
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
		this.endianness = endianness();
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
		paramObj.dimensions = paramObj.dimensions || [];
		mode = paramObj.mode && paramObj.mode.toLowerCase();
		
		if ( mode == "cpu" ) {
			return this._backendFallback(kernel, paramObj);
		}
		
		//
		// Attempts to do the glsl conversion
		//
		try {
			return this._backendGLSL(kernel, paramObj);
		} catch (e) {
			if ( mode != "gpu") {
				console.warning("Falling back to CPU!");
				return this._backendFallback(kernel, paramObj);
			} else {
				return null;
			}
		}
	};
	
	
	GPU.prototype.textureToArray = function(texture) {
		var copy = this.createKernel(function(x) {
			return x[this.thread.z][this.thread.y][this.thread.x];
		});
		
		return copy(texture);
	};

	return GPU;
})();
