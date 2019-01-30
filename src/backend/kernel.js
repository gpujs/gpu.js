const {
	utils
} = require('../utils');
const {
	Input
} = require('../input');

class Kernel {
	static get isSupported() {
		throw new Error(`"isSupported" not implemented on ${ this.name }`);
	}

	static isContextMatch(context) {
		throw new Error(`"isContextMatch" not implemented on ${ this.name }`);
	}

	static getFeatures() {
		throw new Error(`"getFeatures" not implemented on ${ this.name }`);
	}

	static destroyContext(context) {
		throw new Error(`"destroyContext" called on ${ this.name }`);
	}

	/**
	 *
	 * @param {string} source
	 * @param [settings]
	 */
	constructor(source, settings) {
		if (typeof source !== 'string') {
			throw new Error('source not a string');
		}
		if (!utils.isFunctionString(source)) {
			throw new Error('source not a function string');
		}

		/**
		 * Name of the arguments found from parsing source argument
		 * @type {String[]}
		 */
		this.argumentNames = utils.getArgumentNamesFromString(source);
		this.argumentTypes = null;
		this.argumentSizes = null;

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
		 * @type {IVariableDefinition[]}
		 */
		this.constantDefinitions = null;

		/**
		 * Constants used in kernel via `this.constants`
		 * @type {Object}
		 */
		this.constants = null; // TODO: remove
		this.constantTypes = null; // TODO: remove
		this.hardcodeConstants = null;

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
		 * @type {IFunction[]}
		 */
		this.functions = null;

		/**
		 *
		 * @type {INativeFunction[]}
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
		this.skipValidateSettings = false;
		this.wraparound = null;

		/**
		 * Enforces kernel to write to a new array or texture on run
		 * @type {Boolean}
		 */
		this.outputImmutable = false;

		/**
		 * Enforces kernel to write to a texture on run
		 * @type {Boolean}
		 */
		this.outputToTexture = false;
		this.texSize = null;


		for (let p in settings) {
			if (!settings.hasOwnProperty(p) || !this.hasOwnProperty(p)) continue;
			this[p] = settings[p];
		}
		if (settings.hasOwnProperty('output') && !Array.isArray(settings.output)) {
			this.setOutput(settings.output); // Flatten output object
		}
		if (!this.canvas) this.canvas = this.initCanvas();
		if (!this.context) this.context = this.initContext();
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
	 * @desc Setup the parameter types for the parameters
	 * supplied to the Kernel function
	 *
	 * @param {IArguments} args - The actual parameters sent to the Kernel
	 */
	setupArguments(args) {
		this.argumentTypes = [];
		this.argumentSizes = [];
		for (let i = 0; i < args.length; i++) {
			const arg = args[i];

			this.argumentTypes.push(utils.getVariableType(arg));
			this.argumentSizes.push(arg.constructor === Input ? arg.size : null);
		}
	}

	/**
	 * Setup constants
	 */
	setupConstants() {
		this.constantTypes = {};
		if (this.constants) {
			for (let p in this.constants) {
				this.constantTypes[p] = utils.getVariableType(this.constants[p], true);
			}
		}
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
	 * @desc Fix division by factor of 3 FP accuracy bug
	 * @param {Boolean} fix - should fix
	 */
	setFixIntegerDivisionAccuracy(fix) {
		this.fixIntegerDivisionAccuracy = fix;
		return this;
	}

	/**
	 * @desc Set Constants
	 */
	setConstants(constants) {
		this.constants = constants;
		return this;
	}

	setWraparound(flag) {
		console.warn('Wraparound mode is not supported and undocumented.');
		this.wraparound = flag;
		return this;
	}

	setHardcodeConstants(flag) {
		this.hardcodeConstants = flag;
		return this;
	}

	/**
	 * Set writing to texture on/off
	 * @param flag
	 * @returns {Kernel}
	 */
	setOutputToTexture(flag) {
		this.outputToTexture = flag;
		return this;
	}

	/**
	 * Set to immutable
	 * @param flag
	 * @returns {Kernel}
	 */
	setOutputImmutable(flag) {
		this.outputImmutable = flag;
		return this;
	}

	/**
	 * @desc Toggle texture output mode
	 * @param {Boolean} flag - true to enable floatTextures
	 */
	setFloatTextures(flag) {
		this.floatTextures = flag;
		return this;
	}

	/**
	 * @desc Toggle output mode
	 * @param {Boolean} flag - true to enable float
	 */
	setFloatOutput(flag) {
		this.floatOutput = flag;
		return this;
	}

	setFloatOutputForce(flag) {
		this.floatOutputForce = flag;
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
	 * @desc Bind the webGL instance to kernel
	 * @param {WebGLRenderingContext} context - webGl instance to bind
	 */
	setContext(context) {
		this.context = context;
		return this;
	}

	/**
	 * @desc Validate settings related to Kernel, such as
	 * floatOutputs and Textures, texSize, output,
	 * graphical output.
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

	checkOutput() {
		if (!this.output || !Array.isArray(this.output)) throw new Error('kernel.output not an array');
		if (this.output.length < 1) throw new Error('kernel.output is empty, needs at least 1 value');
		for (let i = 0; i < this.output.length; i++) {
			if (isNaN(this.output[i]) || this.output[i] < 1) {
				throw new Error(`${ this.constructor.name }.output[${ i }] incorrectly defined as \`${ this.output[i] }\`, needs to be numeric, and greater than 0`);
			}
		}
	}
}

module.exports = {
	Kernel
};