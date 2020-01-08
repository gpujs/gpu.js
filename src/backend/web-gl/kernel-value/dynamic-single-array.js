const { utils } = require('../../../utils');
const { WebGLKernelValueSingleArray } = require('./single-array');

class WebGLKernelValueDynamicSingleArray extends WebGLKernelValueSingleArray {
  getSource() {
    return utils.linesToString([
      `uniform sampler2D ${this.id}`,
      `uniform ivec2 ${this.sizeId}`,
      `uniform ivec3 ${this.dimensionsId}`,
    ]);
  }

  updateValue(value) {
    this.dimensions = utils.getDimensions(value, true);
    this.textureSize = utils.getMemoryOptimizedFloatTextureSize(this.dimensions, this.bitRatio);
    this.uploadArrayLength = this.textureSize[0] * this.textureSize[1] * this.bitRatio;
    this.checkSize(this.textureSize[0], this.textureSize[1]);
    this.uploadValue = new Float32Array(this.uploadArrayLength);
    this.kernel.setUniform3iv(this.dimensionsId, this.dimensions);
    this.kernel.setUniform2iv(this.sizeId, this.textureSize);
    super.updateValue(value);
  }
}

module.exports = {
  WebGLKernelValueDynamicSingleArray
};