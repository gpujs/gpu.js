const GPUUtils = require('../gpu-utils');
module.exports = class BaseKernel extends Function {
  constructor(fnString, settings) {
    const args = GPUUtils.getParamNamesFromString(fnString);
    super(args, 'console.log("hi mom 2");return this.run.apply(this, arguments);');
    this._paramNames = GPUUtils.getParamNamesFromString(fnString);
    this._fnString = fnString;
    this._processor = null;
    this._dimensions = null;
    this._debug = false;
    this._graphical = false;
    this._loopMaxIterations = 0;
    this._constants = 0;
    this._wraparound = null;
    this._hardcodeConstants = null;
    this._outputToTexture = null;
    this._floatTextures = null;
    this._floatOutput = null;
    this._floatOutputForce = null;
    this._texSize = null;
    this._runner = null;

    for (let p in settings) {
      if (!settings.hasOwnProperty(p) && !this.hasOwnProperty('_' + p)) continue;
      this['_' + p] = settings[p];
    }
  }

  build() {
    throw new Error('"build" not defined on Base');
  }

  dimensions(dim) {
    this._dimensions = dim;
    return this;
  }

  debug(flag) {
    this._debug = flag;
    return this;
  }

  graphical(flag) {
    this._graphical = flag;
    return this;
  }

  loopMaxIterations(max) {
    this._loopMaxIterations = max;
    return this;
  }

  constants(constants) {
    this._constants = constants;
    return this;
  }

  wraparound(flag) {
    console.warn('Wraparound mode is not supported and undocumented.');
    this._wraparound = flag;
    return this;
  }

  hardcodeConstants(flag) {
    this._hardcodeConstants = flag;
    return this;
  }

  outputToTexture(flag) {
    this._outputToTexture = flag;
    return this;
  }

  floatTextures(flag) {
    this._floatTextures = flag;
    return this;
  }

  floatOutput(flag) {
    this._floatOutput = flag;
    return this;
  }

  floatOutputForce(flag) {
    this._floatOutputForce = flag;
    return this;
  }

  getCanvas() {
    return this.canvas;
  }

  getWebgl() {
    return this.webgl;
  }

  validateOptions() {
    throw new Error('"validateOptions not defined');
  }
};