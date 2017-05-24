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

	combineKernels() {
		const lastKernel = arguments[arguments.length - 2];
		const combinedKernel = arguments[arguments.length - 1];
		if (this.mode === 'cpu') return combinedKernel;

		const canvas = arguments[0].canvas;
		let webGl =  arguments[0].webGl;

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

	get mode() {
		return this._runner.mode;
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
	/// Function: isWebGlSupported
	///
	/// Return TRUE, if browser supports WebGl AND Canvas
	///
	/// Note: This function can also be called directly `GPU.isWebGlSupported()`
	///
	/// Returns:
	/// 	{Boolean} TRUE if browser supports webGl
	///
	static get isWebGlSupported() {
		return utils.isWebGlSupported;
	}

	get isWebGlSupported() {
		return utils.isWebGlSupported;
	}

	get canvas() {
		return this._canvas;
	}

	get webGl() {
		return this._webGl;
	}
};