const { utils } = require('../../../utils');
const { WebGLKernelValueDynamicSingleInput } = require('../../web-gl/kernel-value/dynamic-single-input');

class WebGL2KernelValueDynamicSingleInput extends WebGLKernelValueDynamicSingleInput {
  getSource() {
    return utils.linesToString([
      `uniform highp sampler2D ${this.id}`,
      `uniform highp ivec2 ${this.sizeId}`,
      `uniform highp ivec3 ${this.dimensionsId}`,
    ]);
  }
}

module.exports = {
  WebGL2KernelValueDynamicSingleInput
};