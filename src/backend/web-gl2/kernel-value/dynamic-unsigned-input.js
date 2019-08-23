const { utils } = require('../../../utils');
const { WebGLKernelValueDynamicUnsignedInput } = require('../../web-gl/kernel-value/dynamic-unsigned-input');

class WebGL2KernelValueDynamicUnsignedInput extends WebGLKernelValueDynamicUnsignedInput {
  getSource() {
    const variablePrecision = this.getVariablePrecisionString();
    return utils.linesToString([
      `uniform ${ variablePrecision } sampler2D ${this.id}`,
      `uniform ${ variablePrecision } ivec2 ${this.sizeId}`,
      `uniform ${ variablePrecision } ivec3 ${this.dimensionsId}`,
    ]);
  }
}

module.exports = {
  WebGL2KernelValueDynamicUnsignedInput
};