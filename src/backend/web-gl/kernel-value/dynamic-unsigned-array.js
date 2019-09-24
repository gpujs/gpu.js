const { utils } = require('../../../utils');
const { WebGLKernelValueUnsignedArray } = require('./unsigned-array');

class WebGLKernelValueDynamicUnsignedArray extends WebGLKernelValueUnsignedArray {
  getSource() {
    return utils.linesToString([
      `uniform sampler2D ${this.id}`,
      `uniform ivec2 ${this.sizeId}`,
      `uniform ivec3 ${this.dimensionsId}`,
    ]);
  }

  updateValue(value) {
    this.dimensions = utils.getDimensions(value, true);
    this.textureSize = utils.getMemoryOptimizedPackedTextureSize(this.dimensions, this.bitRatio);
    this.uploadArrayLength = this.textureSize[0] * this.textureSize[1] * (4 / this.bitRatio);
    this.checkSize(this.textureSize[0] * (4 / this.bitRatio), this.textureSize[1] * (4 / this.bitRatio));
    const Type = this.getTransferArrayType(value);
    this.preUploadValue = new Type(this.uploadArrayLength);
    this.uploadValue = new Uint8Array(this.preUploadValue.buffer);
    this.kernel.setUniform3iv(this.dimensionsId, this.dimensions);
    this.kernel.setUniform2iv(this.sizeId, this.textureSize);
    super.updateValue(value);
  }
}

module.exports = {
  WebGLKernelValueDynamicUnsignedArray
};