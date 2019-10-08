const { utils } = require('../../../utils');
const { WebGLKernelValue } = require('./index');

class WebGLKernelValueNumberTexture extends WebGLKernelValue {
  constructor(value, settings) {
    super(value, settings);
    const [width, height] = value.size;
    this.checkSize(width, height);
    this.setupTexture();
    const { size: textureSize, dimensions } = value;
    this.bitRatio = this.getBitRatio(value);
    this.dimensions = dimensions;
    this.textureSize = textureSize;
    this.uploadValue = value.texture;
    this.forceUploadEachRun = true;
  }

  getStringValueHandler() {
    return `const uploadValue_${this.name} = ${this.varName}.texture;\n`;
  }

  getSource() {
    return utils.linesToString([
      `uniform sampler2D ${this.id}`,
      `ivec2 ${this.sizeId} = ivec2(${this.textureSize[0]}, ${this.textureSize[1]})`,
      `ivec3 ${this.dimensionsId} = ivec3(${this.dimensions[0]}, ${this.dimensions[1]}, ${this.dimensions[2]})`,
    ]);
  }

  updateValue(inputTexture) {
    if (inputTexture.constructor !== this.initialValueConstructor) {
      this.onUpdateValueMismatch();
      return;
    }
    if (this.checkContext && inputTexture.context !== this.context) {
      throw new Error(`Value ${this.name} (${this.type}) must be from same context`);
    }
    const { context: gl } = this;
    gl.activeTexture(this.contextHandle);
    gl.bindTexture(gl.TEXTURE_2D, this.uploadValue = inputTexture.texture);
    this.kernel.setUniform1i(this.id, this.index);
  }
}

module.exports = {
  WebGLKernelValueNumberTexture
};