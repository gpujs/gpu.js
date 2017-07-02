const utils = require('./utils');
const WebGLRunner = require('../backend/web-gl/runner');
const CPURunner = require('../backend/cpu/runner');
const WebGLValidatorKernel = require('../backend/web-gl/validator-kernel');
const GPUCore = require("./gpu-core");

///
/// Class: GPU
///
/// Initialises the GPU.js library class which manages the WebGL context for the created functions.
///
class GPU extends GPUCore {
	constructor(settings) {
		super(settings);

		settings = settings || {};
		this._canvas = settings.canvas || null;
		this._webGl = settings.webGl || null;
		let mode = settings.mode || 'webgl';
		if (!utils.isWebGlSupported) {
			console.warn('Warning: gpu not supported, falling back to cpu support');
			mode = 'cpu';
		}

		this.kernels = [];

		const runnerSettings = {
			canvas: this._canvas,
			webGl: this._webGl
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
	/// 	{Function} callable function to run
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

		const kernel = this._runner.buildKernel(fn, settings || {});

		//if canvas didn't come from this, propagate from kernel
		if (!this._canvas) {
			this._canvas = kernel.canvas;
		}
		if (!this._runner.canvas) {
			this._runner.canvas = kernel.canvas;
		}

		this.kernels.push(kernel);

		return kernel;
	}

	///
	///
	/// Function: createKernels
	///
	/// Create a super kernel which executes sub kernels 
	/// and saves their output to be used with the next sub kernel.
	/// This can be useful if we want to save the output on one kernel,
	///	and then use it as an input to another kernel. *Machine Learning*
	///
	/// Example:
	/// (start code)
	///	 		const megaKernel = gpu.createKernels({
	///				addResult: function add(a, b) {
	///	  				return a[this.thread.x] + b[this.thread.x];
	///				},
	///				multiplyResult: function multiply(a, b) {
	///					return a[this.thread.x] * b[this.thread.x];
	///				},
	///			  }, function(a, b, c) {
	///				return multiply(add(a, b), c);
	///			});
	///	
	///			megaKernel(a, b, c);
	/// (end code) 
	/// 
	/// *Note:* You can also define subKernels as an array of functions. 
	/// > [add, multiply]
	///
	/// Parameters:
	///      subKernels - {Object|Array}  Sub kernels for this kernel
	///		 rootKernel - {Function}  	  Root kernel
	/// 
	/// Returns:
	/// 	{Function} callable kernel function
	///
	createKernels() {
		let fn;
		let settings;
		if (typeof arguments[arguments.length - 2] === 'function') {
			fn = arguments[arguments.length - 2];
			settings = arguments[arguments.length - 1];
		} else {
			fn = arguments[arguments.length - 1];
		}
		
		if (!utils.isWebGlDrawBuffersSupported) {
			this._runner = new CPURunner(settings);
		}
		
		const kernel = this.createKernel(fn, settings);
		if (Array.isArray(arguments[0])) {
			const functions = arguments[0];
			for (let i = 0; i < functions.length; i++) {
				kernel.addSubKernel(functions[i]);
			}
		} else {
			const functions = arguments[0];
			for (let p in functions) {
				if (!functions.hasOwnProperty(p)) continue;
				kernel.addSubKernelProperty(p, functions[p]);
			}
		}

		return kernel;
	}

	///
	/// Function: combineKernels
	///
	/// Combine different kernels into one super Kernel, 
	/// useful to perform multiple operations inside one 
	/// kernel without the penalty of data transfer between 
	/// cpu and gpu.
	///
	/// The number of kernel functions sent to this method can be variable.
	/// You can send in one, two, etc.
	///
	/// Example: 
	/// >	combineKernels(add, multiply, function(a,b,c){
	///	>	 	return add(multiply(a,b), c)
	///	>	})
	///
	/// Parameters:
	///      subKernels - {Function}  Kernel function(s) to combine.
	///		 rootKernel - {Function}  Root kernel to combine kernels into
	/// 
	/// Returns:
	/// 	{Function} callable kernel function
	///
	combineKernels() {
		const lastKernel = arguments[arguments.length - 2];
		const combinedKernel = arguments[arguments.length - 1];
		if (this.getMode() === 'cpu') return combinedKernel;

		const canvas = arguments[0].canvas;
		let webGl = arguments[0].webGl;

		for (let i = 0; i < arguments.length - 1; i++) {
			arguments[i]
				.setCanvas(canvas)
				.setWebGl(webGl)
				.setOutputToTexture(true);
		}

		return function() {
			combinedKernel.apply(null, arguments);
			const texSize = lastKernel.texSize;
			const gl = lastKernel.webGl;
			const threadDim = lastKernel.threadDim;
			let result;
			if (lastKernel.floatOutput) {
				result = new Float32Array(texSize[0] * texSize[1] * 4);
				gl.readPixels(0, 0, texSize[0], texSize[1], gl.RGBA, gl.FLOAT, result);
			} else {
				const bytes = new Uint8Array(texSize[0] * texSize[1] * 4);
				gl.readPixels(0, 0, texSize[0], texSize[1], gl.RGBA, gl.UNSIGNED_BYTE, bytes);
				result = Float32Array.prototype.slice.call(new Float32Array(bytes.buffer));
			}

			result = result.subarray(0, threadDim[0] * threadDim[1] * threadDim[2]);

			if (lastKernel.dimensions.length === 1) {
				return result;
			} else if (lastKernel.dimensions.length === 2) {
				return utils.splitArray(result, lastKernel.dimensions[0]);
			} else if (lastKernel.dimensions.length === 3) {
				const cube = utils.splitArray(result, lastKernel.dimensions[0] * lastKernel.dimensions[1]);
				return cube.map(function(x) {
					return utils.splitArray(x, lastKernel.dimensions[0]);
				});
			}
		};
	}


	///
	/// Function: addFunction
	///
	/// Adds additional functions, that the kernel may call.
	///
	/// Parameters:
	/// 	fn              - {Function|String}  JS Function to do conversion
	/// 	paramTypes      - {[String,...]|{variableName: Type,...}} Parameter type array, assumes all parameters are 'float' if null
	/// 	returnType      - {String}       The return type, assumes 'float' if null
	///
	/// Returns:
	/// 	{GPU} returns itself
	///
	addFunction(fn, paramTypes, returnType) {
		this._runner.functionBuilder.addFunction(null, fn, paramTypes, returnType);
		return this;
	}

	///
	/// Function: getMode()
	///
	/// Return the current mode in which gpu.js is executing.
	/// 
	/// Returns:
	/// 	{String} The current mode, "cpu", "webgl", etc.
	///
	getMode() {
		return this._runner.getMode();
	}

	///
	/// Function: get isWebGlSupported()
	///
	/// [GETTER] Return TRUE, if browser supports WebGl AND Canvas
	///
	/// Note: This function can also be called directly `GPU.isWebGlSupported()`
	///
	/// Returns:
	/// 	{Boolean} TRUE if browser supports webGl
	///
	get isWebGlSupported() {
		return utils.isWebGlSupported;
	}

	///
	/// Function: get canvas()
	///
	/// [GETTER] Return the canvas object bound to this gpu instance.
	///
	/// Returns:
	/// 	{Object} Canvas object if present
	///
	get canvas() {
		return this._canvas;
	}

	///
	/// Function: get webGl()
	///
	/// [GETTER] Return the webGl object bound to this gpu instance.
	///
	/// Returns:
	/// 	{Object} WebGl object if present
	///
	get webGl() {
		return this._webGl;
	}
};

// This ensure static methods are "inherited"
// See: https://stackoverflow.com/questions/5441508/how-to-inherit-static-methods-from-base-class-in-javascript
Object.assign(GPU, GPUCore);

module.exports = GPU;