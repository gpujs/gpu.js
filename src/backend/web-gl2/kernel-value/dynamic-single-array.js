const { utils } = require('../../../utils');
const { WebGLKernelValueDynamicSingleArray } = require('../../web-gl/kernel-value/dynamic-single-array');

class WebGL2KernelValueDynamicSingleArray extends WebGLKernelValueDynamicSingleArray {
  getSource() {
    return utils.linesToString([
      `uniform highp sampler2D ${this.id}`,
      `uniform highp ivec2 ${this.sizeId}`,
      `uniform highp ivec3 ${this.dimensionsId}`,
    ]);
  }
}

module.exports = {
  WebGL2KernelValueDynamicSingleArray
};