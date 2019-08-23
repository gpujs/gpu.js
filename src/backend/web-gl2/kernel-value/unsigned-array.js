const { utils } = require('../../../utils');
const { WebGLKernelValueUnsignedArray } = require('../../web-gl/kernel-value/unsigned-array');

class WebGL2KernelValueUnsignedArray extends WebGLKernelValueUnsignedArray {
  getSource() {
    const variablePrecision = this.getVariablePrecisionString();
    return utils.linesToString([
      `uniform ${ variablePrecision } sampler2D ${this.id}`,
      `${ variablePrecision } ivec2 ${this.sizeId} = ivec2(${this.textureSize[0]}, ${this.textureSize[1]})`,
      `${ variablePrecision } ivec3 ${this.dimensionsId} = ivec3(${this.dimensions[0]}, ${this.dimensions[1]}, ${this.dimensions[2]})`,
    ]);
  }
}

module.exports = {
  WebGL2KernelValueUnsignedArray
};