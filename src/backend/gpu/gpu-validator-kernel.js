const GPUKernel = require('./gpu-kernel');
const utils = require('../../utils');

module.exports = class GPUValidatorKernel extends GPUKernel {
  validateOptions() {
    this.texSize = utils.dimToTexSize({
      floatTextures: this.floatTextures,
      floatOutput: this.floatOutput
    }, this.dimensions, true);
  }
};