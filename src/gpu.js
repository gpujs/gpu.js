const GPUUtils = require('./gpu-utils');
const FunctionBuilder = require('./backend/function-builder');
const GPURunner = require('./backend/gpu/gpu-runner');
const CPURunner = require('./backend/cpu/cpu-runner');
///
/// Class: GPU
///
/// Initialises the GPU.js library class which manages the WebGL context for the created functions.
///
module.exports = class GPU {
  constructor() {
    this.functionBuilder = new FunctionBuilder();
    this.runner = GPUUtils.isWebGlSupported
      ? new GPURunner()
      : new CPURunner();
  }
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
	/// 	settings        {Object}      The parameter configuration object (see above)
	///
	/// Returns:
	/// 	callable function to run
	///
  createKernel(fn, settings) {
		//
		// basic parameters safety checks
		//
		if(fn === undefined) {
			throw 'Missing fn parameter';
		}
		if(!GPUUtils.isFunction(fn)) {
			throw 'fn parameter not a function';
		}

		if(settings === undefined) {
      settings = {};
		}

		//
		// Replace the kernel function and param object
		//
		this._fn = fn;
		this._kernelParamObj = settings || this._kernelParamObj || {};
    const kernel = this.runner.buildKernel(fn, settings);

		return kernel;
	}

	get computeMode() {
    return this.runner.mode;
  }

	///
	/// Function: getKernelFunction
	///
	/// Get and returns the kernel function previously set by `createKernel`
	///
	/// Returns:
	/// 	{JS Function}  The calling input function
	///
	getFn() {
		return this._fn;
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
				accept(this._runner.apply(this, args));
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
  addFunction(jsFunction, paramTypeArray, returnType) {
		this.functionBuilder.addFunction(null, jsFunction, paramTypeArray, returnType);
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

