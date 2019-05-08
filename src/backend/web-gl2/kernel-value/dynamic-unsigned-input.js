const { utils } = require('../../../utils');
const { WebGLKernelValueDynamicUnsignedInput } = require('../../web-gl/kernel-value/dynamic-unsigned-input');

class WebGL2KernelValueDynamicUnsignedInput extends WebGLKernelValueDynamicUnsignedInput {
  getSource() {
    return utils.linesToString([
      `uniform highp sampler2D ${this.id}`,
      `uniform highp ivec2 ${this.sizeId}`,
      `uniform highp ivec3 ${this.dimensionsId}`,
    ]);
  }
}

module.exports = {
  WebGL2KernelValueDynamicUnsignedInput
};