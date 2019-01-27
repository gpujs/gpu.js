const utils = require('../utils');
const Input = require('../input');

/**
 * @desc Implements the base class for Kernels, and is used as a parent class for all Kernel implementations.
 * @prop {Array} argumentNames - Name of the parameters of the kernel function
 * @prop {String} fn - Kernel function as a String
 * @prop {Array} dimensions - Dimensions of the kernel function, this.thread.x, etc.
 * @prop {Boolean} debug - Toggle debug mode
 * @prop {Boolean} graphical - Toggle graphical mode
 * @prop {number} loopMaxIterations - Maximum number of loop iterations
 * @prop {Object} constants - Global constants
 * @prop {Array} subKernels - Sub kernels bound to this kernel instance
 * @prop {Boolean} fixIntegerDivisionAccuracy - fix issues with some graphics cards not returning whole numbers when dividing by factors of 3
 *
 */
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

	getMode() {
		throw new Error(`"getMode" not implemented on ${ this.constructor.name }`);
	}

	/**
	 *
	 * @param {string} fn
	 * @param settings
	 */
	constructor(fn, settings) {
		this.argumentNames = utils.getArgumentNamesFromString(fn);
		this.fn = fn;
		this.output = null;
		this.debug = false;
		this.graphical = false;
		this.loopMaxIterations = 0;
		this.constants = null;
		this.wraparound = null;
		this.hardcodeConstants = null;
		this.outputToTexture = null;
		this.outputImmutable = null;
		this.texSize = null;
		this.canvas = null;
		this.context = null;

		//TODO move to gl-kernel
		this.threadDim = null;
		this.floatTextures = null;
		this.floatOutput = null;
		this.floatOutputForce = null;

		this.skipValidateSettings = false;
		this.subKernels = null;
		this.argumentTypes = null;
		this.argumentSizes = null;
		this.constantTypes = null;
		this.functions = null;
		this.nativeFunctions = null;

		for (let p in settings) {
			if (!settings.hasOwnProperty(p) || !this.hasOwnProperty(p)) continue;
			this[p] = settings[p];
		}
		if (settings.hasOwnProperty('canvas')) {
			this.canvas = settings.canvas;
		}
		if (settings.hasOwnProperty('context')) {
			this.context = settings.context;
		}
		if (settings.hasOwnProperty('output')) {
			this.setOutput(settings.output); // Flatten output object
		}
		if (settings.hasOwnProperty('functions')) {
			this.functions = settings.functions;
		}
		if (settings.hasOwnProperty('nativeFunctions')) {
			this.nativeFunctions = settings.nativeFunctions;
		}
		if (!this.canvas) this.canvas = this.initCanvas();
		if (!this.context) this.context = this.initContext();
	}

	build() {
		throw new Error(`"build" not defined on ${ this.constructor.name }`);
	}

	run() {
		throw new Error(`"run" not defined on ${ this.constructor.name }`)
	}

	initCanvas() {
		throw new Error(`"initCanvas" not defined on ${ this.constructor.name }`);
	}

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

	setupConstants() {
		this.constantTypes = {};
		if (this.constants) {
			for (let p in this.constants) {
				this.constantTypes[p] = utils.getVariableType(this.constants[p], true);
			}
		}
	}

	/**
	 * @desc Set dimensions of the kernel function
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

	setOutputToTexture(flag) {
		this.outputToTexture = flag;
		return this;
	}

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
	 * @param {Canvas} canvas - Canvas to bind
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
	 * @desc Returns the current canvas instance bound to the kernel
	 */
	getCanvas() {
		return this.canvas;
	}

	/**
	 * @desc Returns the current webGl instance bound to the kernel
	 */
	getContext() {
		return this.context;
	}

	validateSettings() {
		throw new Error(`"validateSettings" not defined on ${ this.constructor.name }`);
	}

	exec() {
		return this.execute.apply(this, arguments);
	}

	execute() {
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
	 * @param {{ source: String, property: Number|String, name: String }} subKernel - function (as a String) of the subKernel to add
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

	static destroyContext(context) {
		throw new Error(`"destroyContext" called on ${ this.name }`);
	}

	checkOutput() {
		if (!this.output || !Array.isArray(this.output)) throw new Error('kernel.output not an array');
		for (let i = 0; i < this.output.length; i++) {
			if (isNaN(this.output[i]) || this.output[i] < 1) {
				throw new Error(`${ this.constructor.name }.output[${ i }] incorrectly defined as \`${ this.output[i] }\`, needs to be numeric, and greater than 0`);
			}
		}
	}
}

module.exports = Kernel;