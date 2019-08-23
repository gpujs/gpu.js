const { utils } = require('../../../utils');
const { WebGLKernelValueDynamicHTMLImage } = require('../../web-gl/kernel-value/dynamic-html-image');

class WebGL2KernelValueDynamicHTMLImage extends WebGLKernelValueDynamicHTMLImage {
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
  WebGL2KernelValueDynamicHTMLImage
};