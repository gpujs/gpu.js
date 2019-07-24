const { utils } = require('../../../utils');
const { WebGL2KernelValueSingleArray3DI } = require('../../web-gl2/kernel-value/single-array3d-i');

class WebGL2KernelValueDynamicSingleArray3DI extends WebGL2KernelValueSingleArray3DI {
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
  WebGL2KernelValueDynamicSingleArray3DI
};