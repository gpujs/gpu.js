///
/// Class: GPU
///
/// Initialises the GPU.js library class which manages the WebGL context for the created functions.
///
var GPU = (function() {
	var GPU = GPUCore;
	
	///
	/// Function: createKernel
	///
	/// This creates a callable function object to call the kernel function with the argument parameter set
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
				mode = "cpu";
				return this._mode_cpu(kernel, paramObj);
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
	
	///
	/// Function: getWebgl
	///
	/// Returns the internal gpu webgl instance only if it has been initiated
	///
	/// Retuns:
	/// 	{WebGL object} that the instance use
	///
	GPU.prototype.getWebgl = function() {
		return this.webgl;
	};
	
	///
	/// Function: getCanvas
	///
	/// Returns the internal canvas instance only if it has been initiated
	///
	/// Retuns:
	/// 	{Canvas object} that the instance use
	///
	GPU.prototype.getCanvas = function(mode) {
		if (mode == "cpu") {
			return null;
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
