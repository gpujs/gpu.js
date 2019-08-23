const { utils } = require('../../../utils');
const { WebGLKernelValueDynamicNumberTexture } = require('../../web-gl/kernel-value/dynamic-number-texture');

class WebGL2KernelValueDynamicNumberTexture extends WebGLKernelValueDynamicNumberTexture {
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
  WebGL2KernelValueDynamicNumberTexture
};