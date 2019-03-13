const gpuMock = require('gpu-mock.js');
const {
	utils
} = require('./utils');
const {
	CPUKernel
} = require('./backend/cpu/kernel');
const {
	HeadlessGLKernel
} = require('./backend/headless-gl/kernel');
const {
	WebGL2Kernel
} = require('./backend/web-gl2/kernel');
const {
	WebGLKernel
} = require('./backend/web-gl/kernel');
const {
	kernelRunShortcut
} = require('./kernel-run-shortcut');


/**
 * @type {Kernel[]}
 */
const kernelOrder = [HeadlessGLKernel, WebGL2Kernel, WebGLKernel];

/**
 *
 * @type {string[]}
 */
const kernelTypes = ['gpu', 'cpu'];

const internalKernels = {
	'headlessgl': HeadlessGLKernel,
	'webgl2': WebGL2Kernel,
	'webgl': WebGLKernel,
};

/**
 * The GPU.js library class which manages the GPU context for the creating kernels
 */
class GPU {
	static get isGPUSupported() {
		return kernelOrder.some(Kernel => Kernel.isSupported);
	}

	/**
	 *
	 * @returns {boolean}
	 */
	static get isKernelMapSupported() {
		return kernelOrder.some(Kernel => Kernel.isSupported && Kernel.features.kernelMap);
	}

	/**
	 * @desc TRUE is platform supports OffscreenCanvas
	 */
	static get isOffscreenCanvasSupported() {
		return (typeof Worker !== 'undefined' && typeof OffscreenCanvas !== 'undefined') || typeof importScripts !== 'undefined';
	}

	/**
	 * @desc TRUE if platform supports WebGL
	 */
	static get isWebGLSupported() {
		return WebGLKernel.isSupported;
	}

	/**
	 * @desc TRUE if platform supports WebGL2
	 */
	static get isWebGL2Supported() {
		return WebGL2Kernel.isSupported;
	}

	/**
	 * @desc TRUE if platform supports HeadlessGL
	 */
	static get isHeadlessGLSupported() {
		return HeadlessGLKernel.isSupported;
	}

	/**
	 *
	 * @desc TRUE if platform supports Canvas
	 */
	static get isCanvasSupported() {
		return typeof HTMLCanvasElement !== 'undefined';
	}

	/**
	 * @desc TRUE if platform supports HTMLImageArray}
	 */
	static get isGPUHTMLImageArraySupported() {
		return WebGL2Kernel.isSupported;
	}

	/**
	 * @desc TRUE if platform supports FloatOutput}
	 * @returns {boolean}
	 */
	static get isFloatOutputSupported() {
		return kernelOrder.some(Kernel => Kernel.isSupported && Kernel.features.isFloatRead && Kernel.features.isTextureFloat);
	}

	/**
	 * Creates an instance of GPU.
	 * @param {IGPUSettings} [settings] - Settings to set mode, and other properties
	 */
	constructor(settings) {
		settings = settings || {};
		this.canvas = settings.canvas || null;
		this.context = settings.context || null;
		this.mode = settings.mode;
		if (this.mode === 'dev') return;
		this.Kernel = null;
		this.kernels = [];
		this.functions = [];
		this.nativeFunctions = [];
		this.chooseKernel();
		// add functions from settings
		if (settings.functions) {
			for (let i = 0; i < settings.functions.length; i++) {
				this.addFunction(settings.functions[i]);
			}
		}

		// add native functions from settings
		if (settings.nativeFunctions) {
			for (const p in settings.nativeFunctions) {
				this.addNativeFunction(p, settings.nativeFunctions[p]);
			}
		}
	}

	/**
	 * Choose kernel type and save on .Kernel property of GPU
	 */
	chooseKernel() {
		if (this.Kernel) return;

		let Kernel = null;

		if (this.context) {
			for (let i = 0; i < kernelOrder.length; i++) {
				const ExternalKernel = kernelOrder[i];
				if (ExternalKernel.isContextMatch(this.context)) {
					Kernel = ExternalKernel;
					break;
				}
			}
			if (Kernel === null) {
				throw new Error('unknown Context');
			}
		} else if (this.mode) {
			if (this.mode in internalKernels) {
				if (internalKernels[this.mode].isSupported) {
					Kernel = internalKernels[this.mode];
				}
			} else if (this.mode === 'gpu') {
				for (let i = 0; i < kernelOrder.length; i++) {
					if (kernelOrder[i].isSupported) {
						Kernel = kernelOrder[i];
						break;
					}
				}
			} else if (this.mode === 'cpu') {
				Kernel = CPUKernel;
			}
			if (!Kernel) {
				throw new Error(`A requested mode of "${this.mode}" and is not supported`);
			}
		} else {
			for (let i = 0; i < kernelOrder.length; i++) {
				if (kernelOrder[i].isSupported) {
					Kernel = kernelOrder[i];
					break;
				}
			}
			if (!Kernel) {
				Kernel = CPUKernel;
			}
		}

		if (!this.mode) {
			this.mode = Kernel.mode;
		}
		this.Kernel = Kernel;
	}

	/**
	 * @desc This creates a callable function object to call the kernel function with the argument parameter set
	 * @param {Function|String|object} source - The calling to perform the conversion
	 * @param {Object} [settings] - The parameter configuration object
	 * @returns {Kernel} callable function to run
	 */
	createKernel(source, settings) {
		if (typeof source === 'undefined') {
			throw new Error('Missing source parameter');
		}
		if (typeof source !== 'object' && !utils.isFunction(source) && typeof source !== 'string') {
			throw new Error('source parameter not a function');
		}

		if (this.mode === 'dev') {
			return gpuMock(source, settings);
		}

		source = typeof source === 'function' ? source.toString() : source;
		const mergedSettings = Object.assign({
			context: this.context,
			canvas: this.canvas,
			functions: this.functions,
			nativeFunctions: this.nativeFunctions
		}, settings || {});

		const kernel = kernelRunShortcut(new this.Kernel(source, mergedSettings));

		//if canvas didn't come from this, propagate from kernel
		if (!this.canvas) {
			this.canvas = kernel.canvas;
		}

		//if context didn't come from this, propagate from kernel
		if (!this.context) {
			this.context = kernel.context;
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

		if (!this.Kernel.isSupported || !this.Kernel.features.kernelMap) {
			if (this.mode && kernelTypes.indexOf(this.mode) < 0) {
				throw new Error(`kernelMap not supported on ${this.Kernel.name}`);
			}
		}

		const kernel = this.createKernel(fn, settings);
		if (Array.isArray(arguments[0])) {
			const functions = arguments[0];
			for (let i = 0; i < functions.length; i++) {
				const source = functions[i].toString();
				const name = utils.getFunctionNameFromString(source);
				kernel.addSubKernel({
					name,
					source,
					property: i,
				});
			}
		} else {
			const functions = arguments[0];
			for (let p in functions) {
				if (!functions.hasOwnProperty(p)) continue;
				const source = functions[p].toString();
				const name = utils.getFunctionNameFromString(source);
				kernel.addSubKernel({
					name: name || p,
					source,
					property: p,
				});
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
		if (this.mode === 'cpu') return combinedKernel;

		const canvas = arguments[0].canvas;
		let context = arguments[0].context;

		for (let i = 0; i < arguments.length - 1; i++) {
			arguments[i]
				.setCanvas(canvas)
				.setContext(context)
				.setPipeline(true);
		}

		//TODO: needs moved to kernel
		return function() {
			combinedKernel.apply(null, arguments);
			const texSize = lastKernel.texSize;
			const gl = lastKernel.context;
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
	 * @param {Function|String} source - Javascript function to convert
	 * @param {IFunctionSettings} [settings]
	 * @returns {GPU} returns itself
	 */
	addFunction(source, settings) {
		settings = settings || {};
		if (typeof source !== 'string' && typeof source !== 'function') throw new Error('source not a string or function');
		const sourceString = typeof source === 'string' ? source : source.toString();

		let argumentTypes = [];

		if (typeof settings.argumentTypes === 'object') {
			argumentTypes = utils.getArgumentNamesFromString(sourceString)
				.map(name => settings.argumentTypes[name]) || [];
		} else {
			argumentTypes = settings.argumentTypes || [];
		}

		this.functions.push({
			source: sourceString,
			argumentTypes,
			returnType: settings.returnType
		});
		return this;
	}

	/**
	 * @desc Adds additional native functions, that the kernel may call.
	 * @param {String} name - native function name, used for reverse lookup
	 * @param {String} source - the native function implementation, as it would be defined in it's entirety
	 * @param {object} [settings]
	 * @returns {GPU} returns itself
	 */
	addNativeFunction(name, source, settings) {
		if (this.kernels.length > 0) {
			throw new Error('Cannot call "addNativeFunction" after "createKernels" has been called.');
		}
		settings = settings || {};
		this.nativeFunctions.push({
			name,
			source,
			settings,
			argumentTypes: this.Kernel.nativeFunctionArgumentTypes(source),
			returnType: this.Kernel.nativeFunctionReturnType(source),
		});
		return this;
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

module.exports = {
	GPU,
	kernelOrder,
	kernelTypes
};