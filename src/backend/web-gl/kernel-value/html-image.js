const { utils } = require('../../../utils');
const { WebGLKernelArray } = require('./array');

class WebGLKernelValueHTMLImage extends WebGLKernelArray {
  constructor(value, settings) {
    super(value, settings);
    const { width, height } = value;
    this.checkSize(width, height);
    this.dimensions = [width, height, 1];
    this.textureSize = [width, height];
    this.uploadValue = value;
  }

  getStringValueHandler() {
    return `const uploadValue_${this.name} = ${this.varName};\n`;
  }

  getSource() {
    return utils.linesToString([
      `uniform sampler2D ${this.id}`,
      `ivec2 ${this.sizeId} = ivec2(${this.textureSize[0]}, ${this.textureSize[1]})`,
      `ivec3 ${this.dimensionsId} = ivec3(${this.dimensions[0]}, ${this.dimensions[1]}, ${this.dimensions[2]})`,
    ]);
  }

  updateValue(inputImage) {
    if (inputImage.constructor !== this.initialValueConstructor) {
      this.onUpdateValueMismatch(inputImage.constructor);
      return;
    }
    const { context: gl } = this;
    gl.activeTexture(this.contextHandle);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.uploadValue = inputImage);
    this.kernel.setUniform1i(this.id, this.index);
  }
}

module.exports = {
  WebGLKernelValueHTMLImage
};