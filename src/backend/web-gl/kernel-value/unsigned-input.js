const { utils } = require('../../../utils');
const { WebGLKernelArray } = require('./array');

class WebGLKernelValueUnsignedInput extends WebGLKernelArray {
  constructor(value, settings) {
    super(value, settings);
    this.bitRatio = this.getBitRatio(value);
    const [w, h, d] = value.size;
    this.dimensions = new Int32Array([w || 1, h || 1, d || 1]);
    this.textureSize = utils.getMemoryOptimizedPackedTextureSize(this.dimensions, this.bitRatio);
    this.uploadArrayLength = this.textureSize[0] * this.textureSize[1] * (4 / this.bitRatio);
    this.checkSize(this.textureSize[0] * (4 / this.bitRatio), this.textureSize[1] * (4 / this.bitRatio));
    this.TranserArrayType = this.getTransferArrayType(value.value);
    this.preUploadValue = new this.TranserArrayType(this.uploadArrayLength);
    this.uploadValue = new Uint8Array(this.preUploadValue.buffer);
  }

  getStringValueHandler() {
    return utils.linesToString([
      `const preUploadValue_${this.name} = new ${this.TranserArrayType.name}(${this.uploadArrayLength})`,
      `const uploadValue_${this.name} = new Uint8Array(preUploadValue_${this.name}.buffer)`,
      `flattenTo(${this.varName}.value, preUploadValue_${this.name})`,
    ]);
  }

  getSource() {
    return utils.linesToString([
      `uniform sampler2D ${this.id}`,
      `ivec2 ${this.sizeId} = ivec2(${this.textureSize[0]}, ${this.textureSize[1]})`,
      `ivec3 ${this.dimensionsId} = ivec3(${this.dimensions[0]}, ${this.dimensions[1]}, ${this.dimensions[2]})`,
    ]);
  }

  updateValue(input) {
    if (input.constructor !== this.initialValueConstructor) {
      this.onUpdateValueMismatch(value.constructor);
      return;
    }
    const { context: gl } = this;
    utils.flattenTo(input.value, this.preUploadValue);
    gl.activeTexture(this.contextHandle);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.textureSize[0], this.textureSize[1], 0, gl.RGBA, gl.UNSIGNED_BYTE, this.uploadValue);
    this.kernel.setUniform1i(this.id, this.index);
  }
}

module.exports = {
  WebGLKernelValueUnsignedInput
};