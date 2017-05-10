const utils = require('../../utils');
const BaseRunner = require('../base-runner');
const CPUKernel = require('./cpu-kernel');
const CPUFunctionBuilder = require('./cpu-function-builder');

module.exports = class CPURunner extends BaseRunner {
  constructor(settings) {
    super(new CPUFunctionBuilder(), settings);
    this.Kernel = CPUKernel;
    this.kernel = null;
  }

	get mode() {
    return 'cpu';
  }
};
