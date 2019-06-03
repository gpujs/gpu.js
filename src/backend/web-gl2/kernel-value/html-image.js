const { utils } = require('../../../utils');
const { WebGLKernelValueHTMLImage } = require('../../web-gl/kernel-value/html-image');

class WebGL2KernelValueHTMLImage extends WebGLKernelValueHTMLImage {
  getSource() {
    // TODO: Do we really need highp?
    return utils.linesToString([
      `uniform highp sampler2D ${this.id}`,
      `highp ivec2 ${this.sizeId} = ivec2(${this.textureSize[0]}, ${this.textureSize[1]})`,
      `highp ivec3 ${this.dimensionsId} = ivec3(${this.dimensions[0]}, ${this.dimensions[1]}, ${this.dimensions[2]})`,
    ]);
  }
}

module.exports = {
  WebGL2KernelValueHTMLImage
};