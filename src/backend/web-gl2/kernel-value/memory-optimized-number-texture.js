const { utils } = require('../../../utils');
const { WebGLKernelValueMemoryOptimizedNumberTexture } = require('../../web-gl/kernel-value/memory-optimized-number-texture');

class WebGL2KernelValueMemoryOptimizedNumberTexture extends WebGLKernelValueMemoryOptimizedNumberTexture {
  getSource() {
    const { id, sizeId, textureSize, dimensionsId, dimensions } = this;
    const variablePrecision = this.getVariablePrecisionString();
    return utils.linesToString([
      `uniform sampler2D ${id}`,
      `${ variablePrecision } ivec2 ${sizeId} = ivec2(${textureSize[0]}, ${textureSize[1]})`,
      `${ variablePrecision } ivec3 ${dimensionsId} = ivec3(${dimensions[0]}, ${dimensions[1]}, ${dimensions[2]})`,
    ]);
  }
}

module.exports = {
  WebGL2KernelValueMemoryOptimizedNumberTexture
};