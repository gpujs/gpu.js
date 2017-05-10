const BaseRunner = require('../base-runner');
const GPUKernel = require('./gpu-kernel');
const utils = require('../../utils');
const GPUFunctionBuilder = require('./gpu-function-builder');

module.exports = class GPURunner extends BaseRunner {
  constructor(settings) {
    super(new GPUFunctionBuilder(), settings);
    this.webGl = this.webGl || utils.initWebGl(this.canvas);
    this.Kernel = GPUKernel;
    this.kernel = null;
  }

	get mode() {
    return 'gpu';
  }
};
