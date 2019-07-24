const { utils } = require('../../../utils');
const { WebGL2KernelValueSingleArray1DI } = require('../../web-gl2/kernel-value/single-array1d-i');

class WebGL2KernelValueDynamicSingleArray1DI extends WebGL2KernelValueSingleArray1DI {
  getSource() {
    return utils.linesToString([
      `uniform highp sampler2D ${this.id}`,
      `uniform highp ivec2 ${this.sizeId}`,
      `uniform highp ivec3 ${this.dimensionsId}`,
    ]);
  }

  updateValue(value) {
    this.setShape(value);
    this.kernel.setUniform3iv(this.dimensionsId, this.dimensions);
    this.kernel.setUniform2iv(this.sizeId, this.textureSize);
    super.updateValue(value);
  }
}

module.exports = {
  WebGL2KernelValueDynamicSingleArray1DI
};