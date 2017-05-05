const BaseRunner = require('../base-runner');
const utils = require('../../utils');
const GPUKernel = require('./gpu-kernel');
const GPUFunctionBuilder = require('./gpu-function-builder');

module.exports = class GPURunner extends BaseRunner {
  constructor(opt) {
    opt = opt || {};
    super(new GPUFunctionBuilder());
    this.programUniformLocationCache = {};
    this.programCacheKey = utils.getProgramCacheKey(arguments, opt, opt.dimensions);
    this.programCache = {};
    this.bufferCache = {};
    this.textureCache = {};
    this.framebufferCache = {};

    this.Kernel = GPUKernel;
    this.kernel = null;
  }

  getUniformLocation(name) {
    let location = this.programUniformLocationCache[this.programCacheKey][name];
    if (!location) {
      location = this._webGl.getUniformLocation(this.kernel.program, name);
      this.programUniformLocationCache[this.programCacheKey][name] = location;
    }
    return location;
  }

	get mode() {
    return 'gpu';
  }
};
