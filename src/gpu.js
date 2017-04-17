const GPUUtils = require('./gpu-utils');
///
/// Class: GPU
///
/// Initialises the GPU.js library class which manages the WebGL context for the created functions.
///
export default class GPU {
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
	/// | mode          | null          | CPU / GPU configuration mode, 'auto' / null. Has the following modes.     |
	/// |               |               |     + null / 'auto' : Attempts to build GPU mode, else fallbacks          |
	/// |               |               |     + 'gpu' : Attempts to build GPU mode, else fallbacks                  |
	/// |               |               |     + 'cpu' : Forces JS fallback mode only                                |
	/// |---------------|---------------|---------------------------------------------------------------------------|
	///
	/// Parameters:
	/// 	inputFunction   {JS Function} The calling to perform the conversion
	/// 	paramObj        {Object}      The parameter configuration object (see above)
	///
	/// Returns:
	/// 	callable function to run
	///
  createKernel(kernel, paramObj) {
		//
		// basic parameters safety checks
		//
		if(kernel === undefined) {
			throw 'Missing kernel parameter';
		}
		if(!GPUUtils.isFunction(kernel)) {
			throw 'kernel parameter not a function';
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
		const mode = paramObj.mode && paramObj.mode.toLowerCase();
		this.computeMode = mode || 'auto';

		//
		// Get the Synchronous executor
		//
		const ret = this.getSynchronousModeExecutor();
		// Allow class refence from function
		ret.gpujs = this;
		// Execute callback
		ret.exec = ret.execute = GPUUtils.functionBinder( this.execute, this );

		// The Synchronous kernel
		this._kernelSynchronousExecutor = ret; //For exec to reference

		return ret;
	}

	///
	/// Function: getKernelFunction
	///
	/// Get and returns the kernel function previously set by `createKernel`
	///
	/// Returns:
	/// 	{JS Function}  The calling input function
	///
	getKernelFunction() {
		return this._kernelFunction;
	}

	///
	/// Function: getKernelParamObj
	///
	/// Get and returns the kernel parameter object previously set by `createKernel`
	///
	/// Returns:
	/// 	{JS Function}  The calling input function
	///
  getKernelParamObj() {
		return this._kernelParamObj;
	}

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
  execute() {
		//
		// Prepare the required objects
		//
		const args = (arguments.length === 1 ? [arguments[0]] : Array.apply(null, arguments));

		//
		// Setup and return the promise, and execute the function, in synchronous mode
		//
		return GPUUtils.newPromise((accept,reject) => {
			try {
				accept( this._kernelSynchronousExecutor.apply(this, args) );
			} catch (e) {
				//
				// Error : throw rejection
				//
				reject(e);
			}
		});
	}

	get exec() {
    return this.execute.bind(this);
  }

	///
	/// Function: addFunction
	///
	/// Adds additional functions, that the kernel may call.
	///
	/// Parameters:
	/// 	jsFunction      - {JS Function}  JS Function to do conversion
	/// 	paramTypeArray  - {[String,...]} Parameter type array, assumes all parameters are 'float' if null
	/// 	returnType      - {String}       The return type, assumes 'float' if null
	///
	/// Retuns:
	/// 	{GPU} returns itself
	///
  addFunction( jsFunction, paramTypeArray, returnType  ) {
		this.functionBuilder.addFunction( null, jsFunction, paramTypeArray, returnType );
		return this;
	}

	///
	/// Function: getWebgl
	///
	/// [DEPRECATED] Returns the internal gpu webgl instance only if it has been initiated
	///
	/// Retuns:
	/// 	{WebGL object} that the instance use
	///
  getWebGl() {
    // if( this.webgl == null ) {
    // 	this.webgl = GPUUtils.init_webgl( getCanvas('gpu') );
    // }
    if (this.webgl) {
      return this.webgl;
    }
    throw 'only call getWebGl after createKernel(gpu)'
  }

	///
	/// Function: getCanvas
	///
	/// [DEPRECATED] Returns the internal canvas instance only if it has been initiated
	///
	/// Retuns:
	/// 	{Canvas object} that the instance use
	///
  getCanvas(mode) {
		// if(mode == 'gpu') {
		// 	if(this._canvas_gpu == null) {
		// 		this._canvas_gpu = GPUUtils.init_canvas();
		// 	}
		// 	return this._canvas_gpu;
		// } else if(mode == 'cpu') {
		// 	if(this._canvas_cpu == null) {
		// 		this._canvas_cpu = GPUUtils.init_canvas();
		// 	}
		// 	return this._canvas_cpu;
		// } else {
		// 	if( this._canvas_gpu || this._canvas_cpu ) {
		// 		return (this._canvas_gpu || this._canvas_cpu );
		// 	}
		// 	// if( this._canvas_gpu || this._canvas_cpu ) {
		// 	//
		// 	// }
		// 	throw 'Missing valid mode parameter in getCanvas('+mode+')'
		// }
		if( this.canvas ) {
			return this.canvas;
		}
		throw 'only call getCanvas after createKernel()';
	}

	///
	/// Function: supportWebGl
	///
	/// Return TRUE, if browser supports WebGl AND Canvas
	///
	/// Note: This function can also be called directly `GPU.supportWebgl()`
	///
	/// Returns:
	/// 	{Boolean} TRUE if browser supports webgl
	///
  static supportWebGl() {
		return GPUUtils.isWebGlSupported;
	}

  supportWebGl() {
    return GPUUtils.isWebGlSupported;
  }
}

