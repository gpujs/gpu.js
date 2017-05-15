const utils = require('./utils');
const WebGLRunner = require('./backend/web-gl/runner');
const CPURunner = require('./backend/cpu/runner');
const WebGLValidatorKernel = require('./backend/web-gl/validator-kernel');

///
/// Class: GPU
///
/// Initialises the GPU.js library class which manages the WebGL context for the created functions.
///
module.exports = class GPU {
	constructor(settings) {
		settings = settings || {};
		this.canvas = settings.canvas;
		this.webGl = settings.webGl;
		this._kernelSynchronousExecutor = null;
		let mode = settings.mode || 'webgl';
		if (!utils.isWebGlSupported) {
			console.warn('Warning: gpu not supported, falling back to cpu support');
			mode = 'cpu';
		}
    
		const runnerSettings = {
			canvas: this.canvas,
			webGl: this.webGl
		};

		if (mode) {
			switch (mode.toLowerCase()) {
				case 'cpu':
					this._runner = new CPURunner(runnerSettings);
					break;
				case 'gpu':
				case 'webgl':
					this._runner = new WebGLRunner(runnerSettings);
					break;
				case 'webgl-validator':
					this._runner = new WebGLRunner(runnerSettings);
					this._runner.Kernel = WebGLValidatorKernel;
					break;
				default:
					throw new Error(`"${mode}" mode is not defined`);
			}
		}
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
		if (typeof fn === 'undefined') {
			throw 'Missing fn parameter';
		}
		if (!utils.isFunction(fn)) {
			throw 'fn parameter not a function';
		}

		return this._kernelSynchronousExecutor = this._runner.buildKernel(fn, settings || {});
	}

	get mode() {
		return this._runner.mode;
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
		return utils.newPromise((accept, reject) => {
			try {
				accept(this._kernelSynchronousExecutor.apply(this._kernelSynchronousExecutor, args));
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
	/// Returns:
	/// 	{GPU} returns itself
	///
	addFunction(jsFunction, paramTypeArray, returnType) {
		this._runner.functionBuilder.addFunction(null, jsFunction, paramTypeArray, returnType);
		return this;
	}

	///
	/// Function: isWebGlSupported
	///
	/// Return TRUE, if browser supports WebGl AND Canvas
	///
	/// Note: This function can also be called directly `GPU.isWebGlSupported()`
	///
	/// Returns:
	/// 	{Boolean} TRUE if browser supports webgl
	///
	static isWebGlSupported() {
		return utils.isWebGlSupported;
	}

	isWebGlSupported() {
		return utils.isWebGlSupported;
	}

	getCanvas() {
		return this._kernelSynchronousExecutor.canvas;
	}
};