const GPUUtils = require('../../gpu-utils');
const BaseRunner = require('../base-runner');
const CPUKernel = require('./cpu-kernel');

module.exports = class CPURunner extends BaseRunner {
  constructor() {
    super();
    this._canvas = GPUUtils.initCanvas();
    this.Kernel = CPUKernel;
    this.kernel = null;
  }

	get mode() {
    return 'cpu';
  }
};
