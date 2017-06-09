const utils = require('../utils');

module.exports = class BaseKernel {
	constructor(fnString, settings) {
		this.paramNames = utils.getParamNamesFromString(fnString);
		this.fnString = fnString;
		this.dimensions = [];
		this.debug = false;
		this.graphical = false;
		this.loopMaxIterations = 0;
		this.constants = 0;
		this.wraparound = null;
		this.hardcodeConstants = null;
		this.outputToTexture = null;
		this.texSize = null;
		this._canvas = null;
		this._webGl = null;
		this.threadDim = null;
		this.floatTextures = null;
		this.floatOutput = null;
		this.floatOutputForce = null;
		this.addFunction = null;
		this.copyData = true;
		this.subKernels = null;
		this.subKernelProperties = null;
		this.subKernelNames = null;

		for (let p in settings) {
			if (!settings.hasOwnProperty(p) || !this.hasOwnProperty(p)) continue;
			this[p] = settings[p];
		}

		if (settings.hasOwnProperty('canvas')) {
			this._canvas = settings.canvas;
		}

		if (!this._canvas) this._canvas = utils.initCanvas();
	}

	build() {
		throw new Error('"build" not defined on Base');
	}

	setAddFunction(cb) {
		this.addFunction = cb;
		return this;
	}

	setDimensions(dimensions) {
		this.dimensions = dimensions;
		return this;
	}

	setDebug(flag) {
		this.debug = flag;
		return this;
	}

	setGraphical(flag) {
		this.graphical = flag;
		return this;
	}

	setLoopMaxIterations(max) {
		this.loopMaxIterations = max;
		return this;
	}

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

	setFloatTextures(flag) {
		this.floatTextures = flag;
		return this;
	}

	setFloatOutput(flag) {
		this.floatOutput = flag;
		return this;
	}

	setFloatOutputForce(flag) {
		this.floatOutputForce = flag;
		return this;
	}

	setCanvas(canvas) {
		this._canvas = canvas;
		return this;
	}

	setWebGl(webGl) {
		this._webGl = webGl;
		return this;
	}

	setCopyData(copyData) {
		this.copyData = copyData;
		return this;
	}

	get canvas() {
		return this._canvas;
	}

	get webGl() {
		return this._webGl;
	}

	validateOptions() {
		throw new Error('validateOptions not defined');
	}

	exec() {
		return this.execute.apply(this, arguments);
	}

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
				accept(this.run.apply(this, args));
			} catch (e) {
				//
				// Error : throw rejection
				//
				reject(e);
			}
		});
	}

	addSubKernel(fnString) {
		if (this.subKernels === null) {
			this.subKernels = [];
			this.subKernelNames = [];
		}
		this.subKernels.push(fnString);
		this.subKernelNames.push(utils.getFunctionNameFromString(fnString));
		return this;
	}

	addSubKernelProperty(property, fnString) {
		if (this.subKernelProperties === null) {
			this.subKernelProperties = {};
			this.subKernelNames = [];
		}
		if (this.subKernelProperties.hasOwnProperty(property)) {
			throw new Error(`cannot add sub kernel ${ property }, already defined`);
		}
		this.subKernelProperties[property] = fnString;
		this.subKernelNames.push(utils.getFunctionNameFromString(fnString));
		return this;
	}
};