const { utils } = require('../../../utils');
const { WebGLKernelValueMemoryOptimizedNumberTexture } = require('./memory-optimized-number-texture');

class WebGLKernelValueDynamicMemoryOptimizedNumberTexture extends WebGLKernelValueMemoryOptimizedNumberTexture {
  getSource() {
    return utils.linesToString([
      `uniform sampler2D ${this.id}`,
      `uniform ivec2 ${this.sizeId}`,
      `uniform ivec3 ${this.dimensionsId}`,
    ]);
  }

  updateValue(inputTexture) {
    this.checkSize(inputTexture.size[0], inputTexture.size[1]);
    this.dimensions = inputTexture.dimensions;
    this.textureSize = inputTexture.size;
    this.kernel.setUniform3iv(this.dimensionsId, this.dimensions);
    this.kernel.setUniform2iv(this.sizeId, this.textureSize);
    super.updateValue(inputTexture);
  }
}

module.exports = {
  WebGLKernelValueDynamicMemoryOptimizedNumberTexture
};