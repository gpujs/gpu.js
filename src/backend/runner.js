const kernelRunShortcut = require('./kernel-run-shortcut');
const features = {};

class Runner {
	/**
	 *
	 * @returns FunctionBuilder
	 */
	static get FunctionBuilder() {
		throw new Error('"FunctionBuilder" not implemented on Runner');
	}

	/**
	 *
	 * @returns Kernel
	 */
	static get Kernel() {
		throw new Error(`"Kernel" not implemented on ${ this.name }`);
	}

	static get isSupported() {
		throw new Error(`"isSupported" not implemented on ${ this.name }`);
	}

	static isContextMatch(context) {
		throw new Error(`"isContextMatch" not implemented on ${ this.name }`);
	}

	static get features() {
		if (!features[this.name]) {
			features[this.name] = this.getFeatures();
		}
		return features[this.name];
	}

	static getFeatures() {
		throw new Error(`"getFeatures" not implemented on ${ this.name }`);
	}

	static get testFunctionBuilder() {
		throw new Error(`"testFunctionBuilder" not implemented on ${ this.name }`);
	}

	constructor(settings) {
		settings = settings || {};
		this.canvas = settings.canvas;
		this.context = settings.context;
		this.functionBuilder = new this.constructor.FunctionBuilder();
	}

	getMode() {
		throw new Error(`"getMode" not implemented on ${ this.constructor.name }`);
	}

	/**
	 * @desc Get and returns the Synchronous executor, of a class and kernel
	 * Which returns the result directly after passing the arguments.
	 */
	buildKernel(fn, settings) {
		settings = Object.assign({}, settings || {});
		const fnString = fn.toString();
		if (!settings.functionBuilder) {
			settings.functionBuilder = this.functionBuilder;
		}

		if (!settings.features) {
			settings.features = this.constructor.features;
		}

		if (!settings.canvas && this.canvas) {
			settings.canvas = this.canvas;
		}

		if (!settings.context && this.context) {
			settings.context = this.context;
		}

		return kernelRunShortcut(new this.constructor.Kernel(fnString, settings));
	}
}

module.exports = Runner;