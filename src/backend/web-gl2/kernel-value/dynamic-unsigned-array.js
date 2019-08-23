const { utils } = require('../../../utils');
const { WebGLKernelValueDynamicUnsignedArray } = require('../../web-gl/kernel-value/dynamic-unsigned-array');

class WebGL2KernelValueDynamicUnsignedArray extends WebGLKernelValueDynamicUnsignedArray {
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
  WebGL2KernelValueDynamicUnsignedArray
};