const { utils } = require('../../../utils');
const { WebGLKernelValueNumberTexture } = require('../../web-gl/kernel-value/number-texture');

class WebGL2KernelValueNumberTexture extends WebGLKernelValueNumberTexture {
  getSource() {
    //TODO: Do we really need highp?
    return utils.linesToString([
      `uniform highp sampler2D ${this.id}`,
      `highp ivec2 ${this.sizeId} = ivec2(${this.textureSize[0]}, ${this.textureSize[1]})`,
      `highp ivec3 ${this.dimensionsId} = ivec3(${this.dimensions[0]}, ${this.dimensions[1]}, ${this.dimensions[2]})`,
    ]);
  }
}

module.exports = {
  WebGL2KernelValueNumberTexture
};