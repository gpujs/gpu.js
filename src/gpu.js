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
	/// 	paramObj        {Object}      The parameter configuration object (see above)
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
		if( !GPUUtils.isFunction(kernel) ) {
			throw "kernel parameter not a function";
		}
		if( paramObj === undefined ) {
			paramObj = {};
		}
		
		//
		// Replace the kernel function and param object
		//
		this._kernelFunction = kernel;
		this._kernelParamObj = paramObj || this._kernelParamObj || {};
		
		//
		// Get the config, fallbacks to default value if not set
		//
		var mode = paramObj.mode && paramObj.mode.toLowerCase();
		this.computeMode = mode || "auto";
		
		//
		// Get the Synchronous executor
		//
		var ret = this.getSynchronousModeExecutor();
		// Allow class refence from function
		ret.gpujs = this; 
		// Execute callback
		ret.exec = ret.execute = GPUUtils.functionBinder( this.execute, this );
		
		// The Synchronous kernel
		this._kernelSynchronousExecutor = ret; //For exec to reference
		
		return ret;
	};
	GPU.prototype.createKernel = createKernel;
	
	///
	/// Function: getKernelFunction
	///
	/// Get and returns the kernel function previously set by `createKernel`
	///
	/// Returns:
	/// 	{JS Function}  The calling input function  
	///
	function getKernelFunction() {
		return this._kernelFunction;
	}
	GPU.prototype.getKernelFunction = getKernelFunction;
	
	///
	/// Function: getKernelParamObj
	///
	/// Get and returns the kernel parameter object previously set by `createKernel`
	///
	/// Returns:
	/// 	{JS Function}  The calling input function  
	///
	function getKernelParamObj() {
		return this._kernelParamObj;
	}
	GPU.prototype.getKernelParamObj = getKernelParamObj;
	
	///
	/// Function: executeKernel
	///
	/// Executes the kernel previously set by setKernel
	///
	/// Parameters:
	/// 	.....  {Arguments} Various argument arrays used by the kernel
	///
	/// Returns:
	/// 	{Promise} returns the promise object for the result / failure
	///
	function execute() {
		//
		// Prepare the required objects
		//
		var args = (arguments.length === 1 ? [arguments[0]] : Array.apply(null, arguments));
		var self = this;
		
		//
		// Setup and return the promise, and execute the function, in synchronous mode
		//
		return GPUUtils.newPromise(function(accept,reject) {
			try {
				accept( self._kernelSynchronousExecutor.apply(self, args) );
			} catch (e) {
				//
				// Error : throw rejection
				//
				reject(e);
				return;
			}
		});
	}
	GPU.prototype.execute = execute;
	GPU.prototype.exec = execute;
	
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
	function getWebgl() {
		return this.webgl;
	};
	GPU.prototype.getWebgl = getWebgl;
	
	///
	/// Function: getCanvas
	///
	/// Returns the internal canvas instance only if it has been initiated
	///
	/// Retuns:
	/// 	{Canvas object} that the instance use
	///
	function getCanvas(mode) {
		return this.canvas;
	};
	GPU.prototype.getCanvas = getCanvas;
	
	///
	/// Function: supportWebgl
	///
	/// Return TRUE, if browser supports webgl AND canvas
	///
	/// Note: This function can also be called directly `GPU.supportWebgl()`
	///
	/// Returns:
	/// 	{Boolean} TRUE if browser supports webgl
	///
	function supportWebgl() {
		return GPUUtils.browserSupport_webgl();
	}
	GPU.prototype.supportWebgl = supportWebgl;
	GPU.supportWebgl = supportWebgl;
	
	return GPU;
})();
