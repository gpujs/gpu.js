const { utils } = require('../../../utils');
const { WebGLKernelValueDynamicInput } = require('../../web-gl/kernel-value/dynamic-html-image');

class WebGL2KernelValueDynamicInput extends WebGLKernelValueDynamicInput {
  getSource() {
    return utils.linesToString([
      `uniform highp sampler2D ${this.id}`,
      `uniform highp ivec2 ${this.sizeId}`,
      `uniform highp ivec3 ${this.dimensionsId}`,
    ]);
  }
}

module.exports = {
  WebGL2KernelValueDynamicInput
};