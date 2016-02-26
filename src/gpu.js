///
/// Class: GPU
///
/// GPU.JS core class =D
///
var GPU = (function() {
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
		var gl, canvas, canvasCpu;

		canvas = undefined;
		gl = ctx;
		if (gl === undefined) {
			canvasCpu = document.createElement('canvas');
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
		this.canvasCpu = canvasCpu;
		this.programCache = {};
		this.endianness = endianness();

		this.functionBuilder = new functionBuilder(this);
		this.functionBuilder.polyfillStandardFunctions();
	}

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
	/// Function: createKernel
	///
	/// The core GPU.js function
	///
	/// The parameter object contains the following sub parameters
	///
	/// |---------------|---------------|---------------------------------------------------------------------------|
	/// | Name          | Default value | Description                                                               |
	/// |---------------|---------------|---------------------------------------------------------------------------|
	/// | dimensions    | [1024]        | Thread dimension array                                                    |
	/// | mode          | null          | CPU / GPU configuration mode, "auto" / null. Has the following modes.     |
	/// |               |               |     + null / "auto" : Attempts to build GPU mode, else fallbacks          |
	/// |               |               |     + "gpu" : Attempts to build GPU mode, else fallbacks                  |
	/// |               |               |     + "cpu" : Forces JS fallback mode only                                |
	/// |---------------|---------------|---------------------------------------------------------------------------|
	///
	/// Parameters:
	/// 	inputFunction   {JS Function} The calling to perform the conversion
	/// 	paramObj        {Object}      The parameter configuration object
	///
	/// Returns:
	/// 	callable function to run
	///
	function createKernel(kernel, paramObj) {
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
		var mode = paramObj.mode && paramObj.mode.toLowerCase();

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
				throw e;
			}
		}
	};
	GPU.prototype.createKernel = createKernel;

	///
	/// Function: addFunction
	///
	/// Adds additional functions, that the kernel may call.
	///
	/// Parameters:
	/// 	jsFunction      - {JS Function}  JS Function to do conversion
	/// 	paramTypeArray  - {[String,...]} Parameter type array, assumes all parameters are "float" if null
	/// 	returnType      - {String}       The return type, assumes "float" if null
	///
	/// Retuns:
	/// 	{GPU} returns itself
	///
	function addFunction( jsFunction, paramTypeArray, returnType  ) {
		this.functionBuilder.addFunction( null, jsFunction, paramTypeArray, returnType );
		return this;
	}
	GPU.prototype.addFunction = addFunction;



	GPU.prototype.textureToArray = function(texture) {
		var copy = this.createKernel(function(x) {
			return x[this.thread.z][this.thread.y][this.thread.x];
		});

		return copy(texture);
	};

	return GPU;
})();
