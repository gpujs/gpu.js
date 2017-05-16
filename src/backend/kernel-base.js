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
		this.canvas = null;
		this.webGl = null;
		this.threadDim = null;
		this.floatTextures = null;
		this.floatOutput = null;
		this.floatOutputForce = null;
		this.addFunction = null;

		for (let p in settings) {
			if (!settings.hasOwnProperty(p) || !this.hasOwnProperty(p)) continue;
			this[p] = settings[p];
		}

		if (!this.canvas) this.canvas = utils.initCanvas();
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
	  this.canvas = canvas;
	  return this;
  }

  setWebGl(webGl) {
	  this.webGl = webGl;
	  return this;
  }

	getCanvas() {
		return this.canvas;
	}

	getWebGl() {
		return this.webGl;
	}

	validateOptions() {
		throw new Error('validateOptions not defined');
	}
};