'use strict';

const utils = require('./utils');
const GPUCore = require('./gpu-core');
const CPURunner = require('../backend/cpu/runner');
const HeadlessGLRunner = require('../backend/headless-gl/runner');
const WebGL2Runner = require('../backend/web-gl2/runner');
const WebGLRunner = require('../backend/web-gl/runner');

const runners = [HeadlessGLRunner, WebGL2Runner, WebGLRunner];

const runnerTypes = ['gpu', 'cpu'];

const internalRunners = {
	'headlessgl': HeadlessGLRunner,
	'webgl2': WebGL2Runner,
	'webgl': WebGLRunner,
};

/**
 * Initialises the GPU.js library class which manages the webGlContext for the created functions.
 */
class GPU extends GPUCore {
	static get runners() {
		return runners;
	}

	static get runnerTypes() {
		return runnerTypes;
	}
	/**
	 * Creates an instance of GPU.
	 * @param {Object} [settings] - Settings to set mode, and other properties. See #GPUCore
	 */
	constructor(settings) {
		super();
		settings = settings || {};
		this.canvas = settings.canvas || null;
		this.context = settings.context || null;
		const mode = this.mode = settings.mode;
		let Runner = null;

		if (this.context) {
			for (let i = 0; i < runners.length; i++) {
				const ExternalRunner = runners[i];
				if (ExternalRunner.isContextMatch(this.context)) {
					Runner = ExternalRunner;
					break;
				}
			}
			if (Runner === null) {
				throw new Error('unknown Context');
			}
		} else if (mode) {
			if (mode in internalRunners) {
				Runner = internalRunners[mode];
			} else if (mode === 'gpu') {
				for (let i = 0; i < runners.length; i++) {
					if (runners[i].isSupported) {
						Runner = runners[i];
						break;
					}
				}
			} else if (mode === 'cpu') {
				Runner = CPURunner;
			}
			if (!Runner) {
				throw new Error(`A requested mode of "${mode}" and is not supported`);
			}
		} else {
			for (let i = 0; i < runners.length; i++) {
				if (runners[i].isSupported) {
					Runner = runners[i];
					break;
				}
			}
			if (!Runner) {
				Runner = CPURunner;
			}
		}

		this.kernels = [];
		this.runner = new Runner(settings);
	}
	/**
	 *
	 * @desc This creates a callable function object to call the kernel function with the argument parameter set
	 *
	 * @param {Function} fn - The calling to perform the conversion
	 * @param {Object} [settings] - The parameter configuration object
	 * @property {String} settings.dimensions - Thread dimension array (Defaults to [1024])
	 * @property {String} settings.mode - CPU / GPU configuration mode (Defaults to null)
	 *
	 * The following modes are supported
	 * *'falsey'* : Attempts to build GPU mode, else fallbacks
	 * *'gpu'* : Attempts to build GPU mode, else fallbacks
	 * *'cpu'* : Forces JS fallback mode only
	 *
	 * @returns {Function} callable function to run
	 */
	createKernel(fn, settings) {
		//
		// basic parameters safety checks
		//
		if (typeof fn === 'undefined') {
			throw 'Missing fn parameter';
		}
		if (!utils.isFunction(fn) && typeof fn !== 'string') {
			throw 'fn parameter not a function';
		}

		const mergedSettings = Object.assign({
			context: this.context,
			canvas: this.canvas
		}, settings || {});

		const kernel = this.runner.buildKernel(fn, mergedSettings);

		//if canvas didn't come from this, propagate from kernel
		if (!this.canvas) {
			this.canvas = kernel.getCanvas();
		}
		if (!this.context) {
			this.context = kernel.getContext();
		}
		this.kernels.push(kernel);

		return kernel;
	}

	/**
	 *
	 * Create a super kernel which executes sub kernels
	 * and saves their output to be used with the next sub kernel.
	 * This can be useful if we want to save the output on one kernel,
	 * and then use it as an input to another kernel. *Machine Learning*
	 *
	 * @param {Object|Array} subKernels - Sub kernels for this kernel
	 * @param {Function} rootKernel - Root kernel
	 *
	 * @returns {Function} callable kernel function
	 *
	 * @example
	 * const megaKernel = gpu.createKernelMap({
	 *   addResult: function add(a, b) {
	 *     return a[this.thread.x] + b[this.thread.x];
	 *   },
	 *   multiplyResult: function multiply(a, b) {
	 *     return a[this.thread.x] * b[this.thread.x];
	 *   },
	 *  }, function(a, b, c) {
	 *       return multiply(add(a, b), c);
	 * });
	 *
	 * megaKernel(a, b, c);
	 *
	 * Note: You can also define subKernels as an array of functions.
	 * > [add, multiply]
	 *
	 */
	createKernelMap() {
		let fn;
		let settings;
		if (typeof arguments[arguments.length - 2] === 'function') {
			fn = arguments[arguments.length - 2];
			settings = arguments[arguments.length - 1];
		} else {
			fn = arguments[arguments.length - 1];
		}

		if (!this.runner.constructor.isSupported || !this.runner.constructor.features.kernelMap) {
			if (this.mode && runnerTypes.indexOf(this.mode) < 0) {
				throw new Error(`kernelMap not supported on ${this.runner.constructor.name}`);
			}
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

	/**
	 *
	 * Combine different kernels into one super Kernel,
	 * useful to perform multiple operations inside one
	 * kernel without the penalty of data transfer between
	 * cpu and gpu.
	 *
	 * The number of kernel functions sent to this method can be variable.
	 * You can send in one, two, etc.
	 *
	 * @param {Function} subKernels - Kernel function(s) to combine.
	 * @param {Function} rootKernel - Root kernel to combine kernels into
	 *
	 * @example
	 * 	combineKernels(add, multiply, function(a,b,c){
	 *	 	return add(multiply(a,b), c)
	 *	})
	 *
	 * @returns {Function} Callable kernel function
	 *
	 */
	combineKernels() {
		const lastKernel = arguments[arguments.length - 2];
		const combinedKernel = arguments[arguments.length - 1];
		if (this.getMode() === 'cpu') return combinedKernel;

		const canvas = arguments[0].getCanvas();
		let context = arguments[0].getContext();

		for (let i = 0; i < arguments.length - 1; i++) {
			arguments[i]
				.setCanvas(canvas)
				.setContext(context)
				.setOutputToTexture(true);
		}

		return function() {
			combinedKernel.apply(null, arguments);
			const texSize = lastKernel.texSize;
			const gl = lastKernel.getContext();
			const threadDim = lastKernel.threadDim;
			let result;
			if (lastKernel.floatOutput) {
				const w = texSize[0];
				const h = Math.ceil(texSize[1] / 4);
				result = new Float32Array(w * h * 4);
				gl.readPixels(0, 0, w, h, gl.RGBA, gl.FLOAT, result);
			} else {
				const bytes = new Uint8Array(texSize[0] * texSize[1] * 4);
				gl.readPixels(0, 0, texSize[0], texSize[1], gl.RGBA, gl.UNSIGNED_BYTE, bytes);
				result = new Float32Array(bytes.buffer);
			}

			result = result.subarray(0, threadDim[0] * threadDim[1] * threadDim[2]);

			if (lastKernel.output.length === 1) {
				return result;
			} else if (lastKernel.output.length === 2) {
				return utils.splitArray(result, lastKernel.output[0]);
			} else if (lastKernel.output.length === 3) {
				const cube = utils.splitArray(result, lastKernel.output[0] * lastKernel.output[1]);
				return cube.map(function(x) {
					return utils.splitArray(x, lastKernel.output[0]);
				});
			}
		};
	}

	/**
	 * @desc Adds additional functions, that the kernel may call.
	 * @param {Function|String} fn - JS Function to do conversion
	 * @param {Object} [settings]
	 * @returns {GPU} returns itself
	 */
	addFunction(fn, settings) {
		this.runner.functionBuilder.addFunction(null, fn, settings);
		return this;
	}

	/**
	 * @desc Adds additional native functions, that the kernel may call.
	 * @param {String} name - native function name, used for reverse lookup
	 * @param {String} nativeFunction - the native function implementation, as it would be defined in it's entirety
	 * @returns {GPU} returns itself
	 */
	addNativeFunction(name, nativeFunction) {
		this.runner.functionBuilder.addNativeFunction(name, nativeFunction);
		return this;
	}

	/**
	 * @desc Return the current mode in which gpu.js is executing.
	 * @returns {String} The current mode, "cpu", "webgl", etc.
	 */
	getMode() {
		return this.runner.getMode();
	}

	/**
	 * @desc Return TRUE, if browser supports WebGL AND Canvas
	 *
	 * @returns {Boolean} TRUE if browser supports webGl
	 */
	static get isWebGLSupported() {
		return WebGLRunner.isSupported;
	}

	/**
	 * @desc Return TRUE, if browser supports WebGL2 AND Canvas
	 *
	 * @returns {Boolean} TRUE if browser supports webGl
	 */
	static get isWebGL2Supported() {
		return WebGL2Runner.isSupported;
	}

	/**
	 * @desc Return TRUE, if node supports WebGL
	 *
	 * @returns {Boolean} TRUE if browser supports webGl
	 */
	static get isHeadlessGLSupported() {
		return HeadlessGLRunner.isSupported;
	}

	static get isCanvasSupported() {
		throw new Error('how to check canvas');
		return utils.isCanvasSupported();
	}
	/**
	 * @desc Return the canvas object bound to this gpu instance.
	 * @returns {Object} Canvas object if present
	 */
	getCanvas() {
		return this.canvas;
	}

	/**
	 * @desc Return the webGl object bound to this gpu instance.
	 * @returns {Object} WebGl object if present
	 */
	getContext() {
		return this.context;
	}

	/**
	 * Return the runner
	 */
	getRunner() {
		return this.runner;
	}

	/**
	 * @desc Destroys all memory associated with gpu.js & the webGl if we created it
	 */
	destroy() {
		// perform on next run loop - for some reason we dont get lose context events
		// if webGl is created and destroyed in the same run loop.
		setTimeout(() => {
			for (let i = 0; i < this.kernels.length; i++) {
				this.kernels[i].destroy(true); // remove canvas if exists
			}
			this.kernels[0].kernel.constructor.destroyContext(this.context);
		}, 0);
	}
}

module.exports = GPU;