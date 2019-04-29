const {
	utils
} = require('../utils');
const {
	Input
} = require('../input');

class Kernel {
	/**
	 * @type {Boolean}
	 */
	static get isSupported() {
		throw new Error(`"isSupported" not implemented on ${ this.name }`);
	}

	/**
	 * @type {Boolean}
	 */
	static isContextMatch(context) {
		throw new Error(`"isContextMatch" not implemented on ${ this.name }`);
	}

	static getFeatures() {
		throw new Error(`"getFeatures" not implemented on ${ this.name }`);
	}

	static destroyContext(context) {
		throw new Error(`"destroyContext" called on ${ this.name }`);
	}

	static nativeFunctionArguments() {
		throw new Error(`"nativeFunctionArguments" called on ${ this.name }`);
	}

	static nativeFunctionReturnType() {
		throw new Error(`"nativeFunctionReturnType" called on ${ this.name }`);
	}

	static combineKernels() {
		throw new Error(`"combineKernels" called on ${ this.name }`);
	}

	/**
	 *
	 * @param {string|object} source
	 * @param [settings]
	 */
	constructor(source, settings) {
		if (typeof source !== 'object') {
			if (typeof source !== 'string') {
				throw new Error('source not a string');
			}
			if (!utils.isFunctionString(source)) {
				throw new Error('source not a function string');
			}
		}

		this.onRequestFallback = null;

		/**
		 * Name of the arguments found from parsing source argument
		 * @type {String[]}
		 */
		this.argumentNames = typeof source === 'string' ? utils.getArgumentNamesFromString(source) : null;
		this.argumentTypes = null;
		this.argumentSizes = null;
		this.argumentBitRatios = null;
		this.argumentsLength = 0;
		this.constantsLength = 0;


		/**
		 * The function source
		 * @type {String}
		 */
		this.source = source;

		/**
		 * The size of the kernel's output
		 * @type {Number[]}
		 */
		this.output = null;

		/**
		 * Debug mode
		 * @type {Boolean}
		 */
		this.debug = false;

		/**
		 * Graphical mode
		 * @type {Boolean}
		 */
		this.graphical = false;

		/**
		 * Maximum loops when using argument values to prevent infinity
		 * @type {Number}
		 */
		this.loopMaxIterations = 0;

		/**
		 * Constants used in kernel via `this.constants`
		 * @type {Object}
		 */
		this.constants = null;
		this.constantTypes = null;
		this.constantBitRatios = null;
		this.hardcodeConstants = false;

		/**
		 *
		 * @type {Object}
		 */
		this.canvas = null;

		/**
		 *
		 * @type {Object}
		 */
		this.context = null;

		/**
		 *
		 * @type {GPU}
		 */
		this.gpu = null;

		/**
		 *
		 * @type {IGPUFunction[]}
		 */
		this.functions = null;

		/**
		 *
		 * @type {IGPUNativeFunction[]}
		 */
		this.nativeFunctions = null;

		/**
		 *
		 * @type {ISubKernel[]}
		 */
		this.subKernels = null;

		/**
		 *
		 * @type {Boolean}
		 */
		this.validate = true;

		/**
		 * Enforces kernel to write to a new array or texture on run
		 * @type {Boolean}
		 */
		this.immutable = false;

		/**
		 * Enforces kernel to write to a texture on run
		 * @type {Boolean}
		 */
		this.pipeline = false;
		this.precision = null;

		this.plugins = null;

		this.returnType = null;
		this.leadingReturnStatement = null;
		this.followingReturnStatement = null;
	}

	mergeSettings(settings) {
		for (let p in settings) {
			if (!settings.hasOwnProperty(p) || !this.hasOwnProperty(p)) continue;
			if (p === 'output') {
				if (!Array.isArray(settings.output)) {
					this.setOutput(settings.output); // Flatten output object
					continue;
				}
			} else if (p === 'functions' && typeof settings.functions[0] === 'function') {
				this.functions = settings.functions.map(source => utils.functionToIFunction(source));
				continue;
			}
			this[p] = settings[p];
		}

		if (!this.canvas) this.canvas = this.initCanvas();
		if (!this.context) this.context = this.initContext();
		if (!this.plugins) this.plugins = this.initPlugins(settings);
	}
	/**
	 * @desc Builds the Kernel, by compiling Fragment and Vertical Shaders,
	 * and instantiates the program.
	 * @abstract
	 */
	build() {
		throw new Error(`"build" not defined on ${ this.constructor.name }`);
	}

	/**
	 * @desc Run the kernel program, and send the output to renderOutput
	 * <p> This method calls a helper method *renderOutput* to return the result. </p>
	 * @returns {Float32Array|Float32Array[]|Float32Array[][]|void} Result The final output of the program, as float, and as Textures for reuse.
	 * @abstract
	 */
	run() {
		throw new Error(`"run" not defined on ${ this.constructor.name }`)
	}

	/**
	 * @abstract
	 * @return {Object}
	 */
	initCanvas() {
		throw new Error(`"initCanvas" not defined on ${ this.constructor.name }`);
	}

	/**
	 * @abstract
	 * @return {Object}
	 */
	initContext() {
		throw new Error(`"initContext" not defined on ${ this.constructor.name }`);
	}

	/**
	 * @param {IFunctionSettings} settings
	 * @return {Object};
	 * @abstract
	 */
	initPlugins(settings) {
		throw new Error(`"initPlugins" not defined on ${ this.constructor.name }`);
	}

	/**
	 * @desc Setup the parameter types for the parameters
	 * supplied to the Kernel function
	 *
	 * @param {IArguments} args - The actual parameters sent to the Kernel
	 */
	setupArguments(args) {
		if (!this.argumentTypes) {
			this.argumentTypes = [];
			for (let i = 0; i < args.length; i++) {
				const argType = utils.getVariableType(args[i]);
				this.argumentTypes.push(argType === 'Integer' ? 'Number' : argType);
			}
		}

		// setup sizes
		this.argumentSizes = new Array(args.length);
		this.argumentBitRatios = new Int32Array(args.length);

		for (let i = 0; i < args.length; i++) {
			const arg = args[i];
			this.argumentSizes[i] = arg.constructor === Input ? arg.size : null;
			this.argumentBitRatios[i] = this.getBitRatio(arg);
		}

		if (this.argumentNames.length !== args.length) {
			throw new Error(`arguments are miss-aligned`);
		}
	}

	/**
	 * Setup constants
	 */
	setupConstants() {
		this.constantTypes = {};
		this.constantBitRatios = {};
		if (this.constants) {
			for (let p in this.constants) {
				this.constantTypes[p] = utils.getVariableType(this.constants[p]);
				this.constantBitRatios[p] = this.getBitRatio(this.constants[p]);
			}
		}
	}

	/**
	 *
	 * @param flag
	 * @returns {Kernel}
	 */
	setOptimizeFloatMemory(flag) {
		this.optimizeFloatMemory = flag;
		return this;
	}

	/**
	 * @desc Set output dimensions of the kernel function
	 * @param {Array|Object} output - The output array to set the kernel output size to
	 */
	setOutput(output) {
		if (output.hasOwnProperty('x')) {
			if (output.hasOwnProperty('y')) {
				if (output.hasOwnProperty('z')) {
					this.output = [output.x, output.y, output.z];
				} else {
					this.output = [output.x, output.y];
				}
			} else {
				this.output = [output.x];
			}
		} else {
			this.output = output;
		}
		return this;
	}

	/**
	 * @desc Toggle debug mode
	 * @param {Boolean} flag - true to enable debug
	 */
	setDebug(flag) {
		this.debug = flag;
		return this;
	}

	/**
	 * @desc Toggle graphical output mode
	 * @param {Boolean} flag - true to enable graphical output
	 */
	setGraphical(flag) {
		this.graphical = flag;
		return this;
	}

	/**
	 * @desc Set the maximum number of loop iterations
	 * @param {number} max - iterations count
	 */
	setLoopMaxIterations(max) {
		this.loopMaxIterations = max;
		return this;
	}

	/**
	 * @desc Set Constants
	 */
	setConstants(constants) {
		this.constants = constants;
		return this;
	}

	/**
	 *
	 * @param {IFunction[]|KernelFunction[]} functions
	 * @returns {Kernel}
	 */
	setFunctions(functions) {
		if (typeof functions[0] === 'function') {
			this.functions = functions.map(source => utils.functionToIFunction(source));
		} else {
			this.functions = functions;
		}
		return this;
	}

	/**
	 * Set writing to texture on/off
	 * @param flag
	 * @returns {Kernel}
	 */
	setPipeline(flag) {
		this.pipeline = flag;
		return this;
	}

	/**
	 * Set precision to 'unsigned' or 'single'
	 * @param {String} flag 'unsigned' or 'single'
	 * @returns {Kernel}
	 */
	setPrecision(flag) {
		this.precision = flag;
		return this;
	}

	setOutputToTexture(flag) {
		utils.warnDeprecated('method', 'setOutputToTexture', 'setPipeline');
		this.pipeline = flag;
		return this;
	}

	/**
	 * Set to immutable
	 * @param flag
	 * @returns {Kernel}
	 */
	setImmutable(flag) {
		this.immutable = flag;
		return this;
	}

	/**
	 * @desc Bind the canvas to kernel
	 * @param {Object} canvas
	 */
	setCanvas(canvas) {
		this.canvas = canvas;
		return this;
	}

	/**
	 * @deprecated
	 * @returns {Object}
	 */
	getCanvas() {
		utils.warnDeprecated('method', 'getCanvas');
		return this.canvas;
	}

	/**
	 * @deprecated
	 * @returns {Object}
	 */
	getWebGl() {
		utils.warnDeprecated('method', 'getWebGl');
		return this.context;
	}

	/**
	 * @desc Bind the webGL instance to kernel
	 * @param {WebGLRenderingContext} context - webGl instance to bind
	 */
	setContext(context) {
		this.context = context;
		return this;
	}

	setArgumentTypes(argumentTypes) {
		this.argumentTypes = argumentTypes;
		return this;
	}

	requestFallback(args) {
		if (!this.onRequestFallback) {
			throw new Error(`"onRequestFallback" not defined on ${ this.constructor.name }`);
		}
		return this.onRequestFallback(args);
	}

	/**
	 * @desc Validate settings
	 * @abstract
	 */
	validateSettings() {
		throw new Error(`"validateSettings" not defined on ${ this.constructor.name }`);
	}

	/**
	 * Run kernel in async mode
	 * @returns {Promise<KernelOutput>}
	 */
	exec() {
		const args = (arguments.length === 1 ? [arguments[0]] : Array.apply(null, arguments));
		return new Promise((accept, reject) => {
			try {
				accept(this.run.apply(this, args));
			} catch (e) {
				reject(e);
			}
		});
	}

	/**
	 * @desc Add a sub kernel to the root kernel instance.
	 * This is what `createKernelMap` uses.
	 *
	 * @param {ISubKernel} subKernel - function (as a String) of the subKernel to add
	 */
	addSubKernel(subKernel) {
		if (this.subKernels === null) {
			this.subKernels = [];
		}
		if (!subKernel.source) throw new Error('subKernel missing "source" property');
		if (!subKernel.property && isNaN(subKernel.property)) throw new Error('subKernel missing "property" property');
		if (!subKernel.name) throw new Error('subKernel missing "name" property');
		this.subKernels.push(subKernel);
		return this;
	}

	/**
	 * @desc Destroys all memory associated with this kernel
	 * @param {Boolean} removeCanvasReferences remove any associated canvas references?
	 */
	destroy(removeCanvasReferences) {
		throw new Error(`"destroy" called on ${ this.constructor.name }`);
	}

	/**
	 * bit storage ratio of source to target 'buffer', i.e. if 8bit array -> 32bit tex = 4
	 * @param value
	 * @returns {number}
	 */
	getBitRatio(value) {
		if (this.precision === 'single') {
			// 8 and 16 are upconverted to float32
			return 4;
		} else if (Array.isArray(value[0])) {
			return this.getBitRatio(value[0]);
		} else if (value.constructor === Input) {
			return this.getBitRatio(value.value);
		}
		switch (value.constructor) {
			case Uint8Array:
			case Int8Array:
				return 1;
			case Uint16Array:
			case Int16Array:
				return 2;
			case Float32Array:
			case Int32Array:
			default:
				return 4;
		}
	}

	/**
	 * @returns {number[]}
	 */
	getPixels() {
		throw new Error(`"getPixels" called on ${ this.constructor.name }`);
	}

	checkOutput() {
		if (!this.output || !Array.isArray(this.output)) throw new Error('kernel.output not an array');
		if (this.output.length < 1) throw new Error('kernel.output is empty, needs at least 1 value');
		for (let i = 0; i < this.output.length; i++) {
			if (isNaN(this.output[i]) || this.output[i] < 1) {
				throw new Error(`${ this.constructor.name }.output[${ i }] incorrectly defined as \`${ this.output[i] }\`, needs to be numeric, and greater than 0`);
			}
		}
	}

	toJSON() {
		const settings = {
			output: this.output,
			threadDim: this.threadDim,
			pipeline: this.pipeline,
			argumentNames: this.argumentNames,
			argumentsTypes: this.argumentTypes,
			argumentsLength: this.argumentsLength,
			constants: this.constants,
			constantsLength: this.constantsLength,
			pluginNames: this.plugins ? this.plugins.map(plugin => plugin.name) : null,
			returnType: this.returnType,
		};
		return {
			settings
		};
	}
}

module.exports = {
	Kernel
};