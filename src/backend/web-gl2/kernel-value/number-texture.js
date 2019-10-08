const { utils } = require('../../../utils');
const { WebGLKernelValueNumberTexture } = require('../../web-gl/kernel-value/number-texture');

class WebGL2KernelValueNumberTexture extends WebGLKernelValueNumberTexture {
  getSource() {
    const { id, sizeId, textureSize, dimensionsId, dimensions } = this;
    const variablePrecision = this.getVariablePrecisionString();
    return utils.linesToString([
      `uniform ${ variablePrecision } sampler2D ${id}`,
      `${ variablePrecision } ivec2 ${sizeId} = ivec2(${textureSize[0]}, ${textureSize[1]})`,
      `${ variablePrecision } ivec3 ${dimensionsId} = ivec3(${dimensions[0]}, ${dimensions[1]}, ${dimensions[2]})`,
    ]);
  }
}

module.exports = {
  WebGL2KernelValueNumberTexture
};