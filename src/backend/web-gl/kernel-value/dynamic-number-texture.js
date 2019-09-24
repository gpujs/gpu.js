const { utils } = require('../../../utils');
const { WebGLKernelValueNumberTexture } = require('./number-texture');

class WebGLKernelValueDynamicNumberTexture extends WebGLKernelValueNumberTexture {
  getSource() {
    return utils.linesToString([
      `uniform sampler2D ${this.id}`,
      `uniform ivec2 ${this.sizeId}`,
      `uniform ivec3 ${this.dimensionsId}`,
    ]);
  }

  updateValue(value) {
    this.dimensions = value.dimensions;
    this.checkSize(value.size[0], value.size[1]);
    this.textureSize = value.size;
    this.kernel.setUniform3iv(this.dimensionsId, this.dimensions);
    this.kernel.setUniform2iv(this.sizeId, this.textureSize);
    super.updateValue(value);
  }
}

module.exports = {
  WebGLKernelValueDynamicNumberTexture
};