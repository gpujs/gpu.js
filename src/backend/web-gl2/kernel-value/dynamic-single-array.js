const { utils } = require('../../../utils');
const { WebGL2KernelValueSingleArray } = require('../../web-gl2/kernel-value/single-array');

class WebGL2KernelValueDynamicSingleArray extends WebGL2KernelValueSingleArray {
  getSource() {
    const variablePrecision = this.getVariablePrecisionString();
    return utils.linesToString([
      `uniform ${ variablePrecision } sampler2D ${this.id}`,
      `uniform ${ variablePrecision } ivec2 ${this.sizeId}`,
      `uniform ${ variablePrecision } ivec3 ${this.dimensionsId}`,
    ]);
  }

  updateValue(value) {
    this.dimensions = utils.getDimensions(value, true);
    this.textureSize = utils.getMemoryOptimizedFloatTextureSize(this.dimensions, this.bitRatio);
    this.uploadArrayLength = this.textureSize[0] * this.textureSize[1] * this.bitRatio;
    this.uploadValue = new Float32Array(this.uploadArrayLength);
    this.kernel.setUniform3iv(this.dimensionsId, this.dimensions);
    this.kernel.setUniform2iv(this.sizeId, this.textureSize);
    super.updateValue(value);
  }
}

module.exports = {
  WebGL2KernelValueDynamicSingleArray
};